"use client"

import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { addMinutes, parseISO, differenceInSeconds } from "date-fns"

export function useJourney({ trainCode, stations }) {
  const [journeyId, setJourneyId] = useState(null)
  const [currentStation, setCurrentStation] = useState(null)
  const [nextStation, setNextStation] = useState(null)
  const [reachedStations, setReachedStations] = useState(new Set())
  const [interruptions, setInterruptions] = useState([])
  const [totalDelay, setTotalDelay] = useState(0)
  const [activeInterruptionTimer, setActiveInterruptionTimer] = useState(null)

  const initializeJourney = async () => {
    console.log("==> [Initialize Journey]")
    console.log("==> [Initialize Journey] Completing old in-progress journeys...")
    await supabase
      .from("journeys")
      .update({ status: "Completed" })
      .eq("train_code", trainCode)
      .eq("status", "In Progress")
      .lt("start_time", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    console.log("==> [Initialize Journey] Getting most recent in-progress journey...")
    const { data: existingJourneys } = await supabase
      .from("journeys")
      .select()
      .eq("train_code", trainCode)
      .eq("status", "In Progress")
      .order("created_at", { ascending: false })
      .limit(1)

    console.log("==> [Initialize Journey] Existing Journeys:", existingJourneys)
    if (existingJourneys && existingJourneys.length > 0) {
      setJourneyId(existingJourneys[0].id)
      const station = stations.find((s) => s.code === existingJourneys[0].next_station)
      if (station) {
        setCurrentStation(station)
      }
    } else if (currentStation) {
      console.log(
        "==> [Initialize Journey] No existing journey found. Starting new journey from current station:",
        currentStation,
      )
      startNewJourney(currentStation)
    } else {
      console.log("==> [Initialize Journey] No existing journey and no current Station")
    }
  }

  // Update the getInterruptions function to ensure it always fetches all interruptions
  const getInterruptions = async () => {
    console.log("==> [Interruptions] Fetching interruptions for journey")
    if (!journeyId) return

    try {
      const { data, error } = await supabase
        .from("journey_interruptions")
        .select(`
        *,
        stations(name)
      `)
        .eq("journey_id", journeyId)
        .order("start_time", { ascending: false }) // Changed to descending to show most recent first
        .limit(50) // Added a limit to ensure we don't fetch too many records

      if (error) {
        console.error("Error fetching interruptions:", error)
        return
      }

      console.log("==> [Interruptions] Fetched interruptions:", data)
      setInterruptions(data || [])
      const total = (data || []).reduce((acc, curr) => acc + (curr.time_delayed_in_seconds || 0), 0)
      setTotalDelay(Math.floor(total / 60))
      console.log("==> [Interruptions] Total Delay:", total)

      // Check if there's an active interruption and start the timer if needed
      const activeInterruption = (data || []).find((i) => !i.end_time)
      if (activeInterruption) {
        startInterruptionTimer(activeInterruption.id)
      } else {
        stopInterruptionTimer()
      }
    } catch (err) {
      console.error("Unexpected error fetching interruptions:", err)
    }
  }

  useEffect(() => {
    initializeJourney()
  }, [trainCode, stations])

  useEffect(() => {
    if (!journeyId) return
    console.log("==> Subscribing to interruptions for journey:", journeyId)
    const subscription = supabase
      .channel(`journey_interruptions:${journeyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "journey_interruptions",
          filter: `journey_id=eq.${journeyId}`,
        },
        async () => {
          console.log("==> [Interruptions] Change detected for journery:", journeyId)
          console.log("==> [Interruptions] Fetching interruptions for journey")
          await getInterruptions()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [journeyId])

  useEffect(() => {
    if (!journeyId) return
    console.log("==> Subscribing to reached stations for journey:", journeyId)
    const subscription = supabase
      .channel(`journey_reached_stations:${journeyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "journey_reached_stations",
          filter: `journey_id=eq.${journeyId}`,
        },
        async () => {
          console.log("==> Change detected for reached stations")
          const { data } = await supabase
            .from("journey_reached_stations")
            .select()
            .eq("journey_id", journeyId)
            .order("arrival_time", { ascending: true })

          if (data) {
            const reached = new Set(data.map((station) => station.station_code))
            setReachedStations(reached)
          }
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [journeyId])

  const startInterruptionTimer = (interruptionId) => {
    console.log("==> Starting interruption timer:", interruptionId)
    if (activeInterruptionTimer) {
      clearInterval(activeInterruptionTimer)
    }

    const timer = setInterval(async () => {
      const { data: interruption } = await supabase
        .from("journey_interruptions")
        .select()
        .eq("id", interruptionId)
        .single()

      if (interruption && !interruption.end_time) {
        const delayInSeconds = differenceInSeconds(new Date(), parseISO(interruption.start_time))
        await supabase
          .from("journey_interruptions")
          .update({ time_delayed_in_seconds: delayInSeconds })
          .eq("id", interruptionId)
      }
    }, 1000)

    setActiveInterruptionTimer(timer)
  }

  const stopInterruptionTimer = () => {
    console.log("==> Stopping interruption timer")
    if (activeInterruptionTimer) {
      clearInterval(activeInterruptionTimer)
      setActiveInterruptionTimer(null)
    }
  }

  const startNewJourney = async (startStation) => {
    console.log("==> [New Journey] Starting new journey from:", trainCode, startStation)
    const { data: newJourney, error } = await supabase
      .from("journeys")
      .insert({
        train_code: trainCode,
        next_station: startStation.code,
        status: "In Progress",
      })
      .select()
      .single()

    if (error) {
      console.error("==> [New Journey] Error creating new journey:", error)
      return
    }

    if (newJourney) {
      console.log("==> [New Journey] New journey created:", newJourney)
      setJourneyId(newJourney.id)
      setCurrentStation(startStation)
      setReachedStations(new Set())
      setInterruptions([])
      setTotalDelay(0)
    }
  }

  const recordStationReached = async (station) => {
    console.log("==> Recording station reached:", station)
    if (!journeyId || reachedStations.has(station.code)) return

    const now = new Date()
    const departureTime = addMinutes(now, 0.5) // 30 seconds stop

    await supabase.from("journey_reached_stations").insert({
      journey_id: journeyId,
      station_code: station.code,
      arrival_time: now.toISOString(),
      departure_time: departureTime.toISOString(),
    })

    await supabase
      .from("journeys")
      .update({
        previous_station: station.code,
        next_station: stations[stations.findIndex((s) => s.code === station.code) + 1]?.code,
      })
      .eq("id", journeyId)

    setCurrentStation(station)
    setReachedStations(new Set([...reachedStations, station.code]))
  }

  const recordInterruption = async (reason, severity = "medium", journeyId) => {
    console.log("==> Recording interruption:", reason, journeyId)
    if (!journeyId) return null

    try {
      // Check for active interruptions
      const { data: activeInterruptions } = await supabase
        .from("journey_interruptions")
        .select("id")
        .eq("journey_id", journeyId)
        .is("end_time", null)
        .single()

      // If there's an active interruption, end it first
      if (activeInterruptions) {
        console.log("found an active interruption")
        await recordInterruptionEnd(activeInterruptions.id)
      }
      console.log("Didn't find an active interruption")

      // Prepare interruption data
      const now = new Date().toISOString()
      const interruptionData = {
        journey_id: journeyId,
        interruption_reason: reason,
        severity: severity,
        start_time: now,
        time_delayed_in_seconds: 0,
        station_code: currentStation?.code || null,
        location_description: currentStation?.name || "Unknown location",
      }
      console.log("inserting", interruptionData)
      // Insert the interruption record
      const { data, error } = await supabase.from("journey_interruptions").insert(interruptionData).select().single()

      if (error) {
        console.error("Error recording interruption:", error)
        throw error
      }

      // Update the journey status
      await supabase
        .from("journeys")
        .update({
          status: "Interrupted",
          last_interruption_time: now,
          last_interruption_reason: reason,
        })
        .eq("id", journeyId)

      console.log("Interruption recorded:", data)

      // Start the timer to track delay
      if (data) {
        startInterruptionTimer(data.id)
      }

      // Refresh interruptions list
      await getInterruptions()

      return data?.id
    } catch (err) {
      console.error("Unexpected error recording interruption:", err)
      return null
    }
  }

  const recordInterruptionEnd = async (interruptionId) => {
    console.log("==> Recording interruption end:", interruptionId)
    if (!journeyId) return

    try {
      const endTime = new Date()
      const endTimeISO = endTime.toISOString()

      // Get the interruption record
      const { data: interruption } = await supabase
        .from("journey_interruptions")
        .select()
        .eq("id", interruptionId)
        .single()

      if (!interruption) {
        console.error("Interruption not found:", interruptionId)
        return
      }

      // Calculate delay time
      const startTime = parseISO(interruption.start_time)
      const delayInSeconds = differenceInSeconds(endTime, startTime)

      // Format resolution notes
      const minutes = Math.floor(delayInSeconds / 60)
      const seconds = delayInSeconds % 60
      const resolutionNotes = `Interruption ended after ${minutes} minutes and ${seconds} seconds.`

      // Update the interruption record
      const { error } = await supabase
        .from("journey_interruptions")
        .update({
          end_time: endTimeISO,
          time_delayed_in_seconds: delayInSeconds,
          resolution_notes: resolutionNotes,
        })
        .eq("id", interruptionId)

      if (error) {
        console.error("Error updating interruption end:", error)
        return
      }

      // Update the journey status
      await supabase
        .from("journeys")
        .update({
          status: "In Progress",
          last_resumed_time: endTimeISO,
        })
        .eq("id", journeyId)

      stopInterruptionTimer()

      // Refresh interruptions list
      await getInterruptions()
    } catch (err) {
      console.error("Unexpected error ending interruption:", err)
    }
  }

  const recordCurrentStation = async (station) => {
    setCurrentStation(station)
    if (!journeyId) return

    const now = new Date()
    const departureTime = addMinutes(now, 0.5) // 30 seconds stop

    await supabase.from("journey_reached_stations").insert({
      journey_id: journeyId,
      station_code: station.code,
      arrival_time: now.toISOString(),
      departure_time: departureTime.toISOString(),
    })

    await supabase
      .from("journeys")
      .update({
        previous_station: station.code,
        next_station: stations[stations.findIndex((s) => s.code === station.code) + 1]?.code,
      })
      .eq("id", journeyId)
  }

  const recordNextStation = async (station) => {
    if (!journeyId) return

    await supabase
      .from("journeys")
      .update({
        next_station: station.code,
      })
      .eq("id", journeyId)

    setNextStation(station)
  }

  return {
    journeyId,
    currentStation,
    reachedStations,
    interruptions,
    totalDelay,
    startNewJourney,
    initializeJourney,
    recordStationReached,
    recordInterruption,
    recordInterruptionEnd,
    recordCurrentStation,
    recordNextStation,
    getInterruptions,
  }
}

