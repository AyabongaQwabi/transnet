import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  addMinutes,
  format,
  parseISO,
  differenceInSeconds,
  set,
} from 'date-fns';

export function useJourney({ trainCode, stations }) {
  const [journeyId, setJourneyId] = useState(null);
  const [currentStation, setCurrentStation] = useState(null);
  const [nextStation, setNextStation] = useState(null);
  const [reachedStations, setReachedStations] = useState(new Set());
  const [interruptions, setInterruptions] = useState([]);
  const [totalDelay, setTotalDelay] = useState(0);
  const [activeInterruptionTimer, setActiveInterruptionTimer] = useState(null);

  const initializeJourney = async () => {
    // First, complete any old in-progress journeys
    console.log('==> [Initialize Journey]');
    console.log(
      '==> [Initialize Journey] Completing old in-progress journeys...'
    );
    await supabase
      .from('journeys')
      .update({ status: 'Completed' })
      .eq('train_code', trainCode)
      .eq('status', 'In Progress')
      .lt(
        'start_time',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      );

    // Get the most recent in-progress journey
    console.log(
      '==> [Initialize Journey] Getting most recent in-progress journey...'
    );
    const { data: existingJourneys } = await supabase
      .from('journeys')
      .select()
      .eq('train_code', trainCode)
      .eq('status', 'In Progress')
      .order('created_at', { ascending: false })
      .limit(1);
    console.log(
      '==> [Initialize Journey]  Existing Journeys:',
      existingJourneys
    );
    if (existingJourneys && existingJourneys.length > 0) {
      setJourneyId(existingJourneys[0].id);
      const station = stations.find(
        (s) => s.code === existingJourneys[0].next_station
      );
      if (station) {
        setCurrentStation(station);
      }
    } else if (currentStation) {
      console.log(
        '==> [Initialize Journey] No existing journey found. Starting new journey from current station:',
        currentStation
      );
      startNewJourney(currentStation);
    } else {
      console.log(
        '==> [Initialize Journey] No existing journey and no current Station'
      );
      //startNewJourney(stations[0]);
    }
  };

  const getInterruptions = async () => {
    console.log('==> [Interruptions] Fetching interruptions for journey');
    if (!journeyId) return;
    const { data } = await supabase
      .from('journey_interruptions')
      .select()
      .eq('journey_id', journeyId)
      .order('start_time', { ascending: true });

    setInterruptions(data);
    const total = data.reduce(
      (acc, curr) => acc + (curr.time_delayed_in_seconds || 0),
      0
    );
    setTotalDelay(Math.floor(total / 60));
    console.log('==> [Interruptions] Total Delay:', total);
  };

  useEffect(() => {
    initializeJourney();
  }, [trainCode, stations]);

  // Subscribe to interruptions
  useEffect(() => {
    if (!journeyId) return;
    console.log('==> Subscribing to interruptions for journey:', journeyId);
    const subscription = supabase
      .channel(`journey_interruptions:${journeyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journey_interruptions',
          filter: `journey_id=eq.${journeyId}`,
        },
        async () => {
          console.log(
            '==> [Interruptions] Change detected for journery:',
            journeyId
          ),
            console.log(
              '==> [Interruptions] Fetching interruptions for journey'
            );
          const { data } = await supabase
            .from('journey_interruptions')
            .select()
            .eq('journey_id', journeyId)
            .order('start_time', { ascending: true });

          if (data) {
            console.log('==> [Interruptions] Interruptions:', data);
            setInterruptions(data);
            const total = data.reduce(
              (acc, curr) => acc + (curr.time_delayed_in_seconds || 0),
              0
            );
            setTotalDelay(Math.floor(total / 60));
            console.log('==> [Interruptions] Total Delay:', total);
            // Start timer for active interruption
            const activeInterruption = data.find((i) => !i.end_time);
            if (activeInterruption) {
              startInterruptionTimer(activeInterruption.id);
            } else {
              stopInterruptionTimer();
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [journeyId]);

  // Subscribe to reached stations
  useEffect(() => {
    if (!journeyId) return;
    console.log('==> Subscribing to reached stations for journey:', journeyId);
    const subscription = supabase
      .channel(`journey_reached_stations:${journeyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journey_reached_stations',
          filter: `journey_id=eq.${journeyId}`,
        },
        async () => {
          console.log('==> Change detected for reached stations');
          const { data } = await supabase
            .from('journey_reached_stations')
            .select()
            .eq('journey_id', journeyId)
            .order('arrival_time', { ascending: true });

          if (data) {
            const reached = new Set(
              data.map((station) => station.station_code)
            );
            setReachedStations(reached);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [journeyId]);

  const startInterruptionTimer = (interruptionId) => {
    console.log('==> Starting interruption timer:', interruptionId);
    if (activeInterruptionTimer) {
      clearInterval(activeInterruptionTimer);
    }

    const timer = setInterval(async () => {
      const { data: interruption } = await supabase
        .from('journey_interruptions')
        .select()
        .eq('id', interruptionId)
        .single();

      if (interruption && !interruption.end_time) {
        const delayInSeconds = differenceInSeconds(
          new Date(),
          parseISO(interruption.start_time)
        );
        await supabase
          .from('journey_interruptions')
          .update({ time_delayed_in_seconds: delayInSeconds })
          .eq('id', interruptionId);
      }
    }, 1000);

    setActiveInterruptionTimer(timer);
  };

  const stopInterruptionTimer = () => {
    console.log('==> Stopping interruption timer');
    if (activeInterruptionTimer) {
      clearInterval(activeInterruptionTimer);
      setActiveInterruptionTimer(null);
    }
  };

  const startNewJourney = async (startStation) => {
    console.log('==> [New Journey] Starting new journey from:', startStation);
    const { data: newJourney, error } = await supabase
      .from('journeys')
      .insert({
        train_code: trainCode,
        next_station: startStation.code,
        status: 'In Progress',
      })
      .select()
      .single();

    if (error) {
      console.error('==> [New Journey] Error creating new journey:', error);
      return;
    }

    if (newJourney) {
      console.log('==> [New Journey] New journey created:', newJourney);
      setJourneyId(newJourney.id);
      setCurrentStation(startStation);
      setReachedStations(new Set());
      setInterruptions([]);
      setTotalDelay(0);
    }
  };

  const recordStationReached = async (station) => {
    console.log('==> Recording station reached:', station);
    if (!journeyId || reachedStations.has(station.code)) return;

    const now = new Date();
    const departureTime = addMinutes(now, 0.5); // 30 seconds stop

    await supabase.from('journey_reached_stations').insert({
      journey_id: journeyId,
      station_code: station.code,
      arrival_time: now.toISOString(),
      departure_time: departureTime.toISOString(),
    });

    await supabase
      .from('journeys')
      .update({
        previous_station: station.code,
        next_station:
          stations[stations.findIndex((s) => s.code === station.code) + 1]
            ?.code,
      })
      .eq('id', journeyId);

    setCurrentStation(station);
    setReachedStations(new Set([...reachedStations, station.code]));
  };

  const recordInterruption = async (reason) => {
    console.log('==> Recording interruption:', reason);
    if (!journeyId) return null;

    console.log('Step 1: Fetch the latest interruption');
    const { data: latestInterruption, error: fetchError } = await supabase
      .from('journey_interruptions')
      .select('*')
      .eq('journey_id', journeyId)
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      console.error('Error fetching latest interruption:', fetchError);
      return null;
    }

    console.log('Latest Interruption:', latestInterruption);

    console.log('Step 2: End the latest interruption if it exists');
    if (latestInterruption) {
      await recordInterruptionEnd(latestInterruption.id);
    }

    console.log('Step 3: Record the new interruption');
    const { data, error } = await supabase
      .from('journey_interruptions')
      .insert({
        journey_id: journeyId,
        interruption_reason: reason,
        start_time: new Date().toISOString(),
        time_delayed_in_seconds: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording interruption:', error);
      return null;
    }

    if (data) {
      console.log('Interruption recorded:', data);
      startInterruptionTimer(data.id);
    }

    return data?.id;
  };

  const recordInterruptionEnd = async (interruptionId) => {
    console.log('==> Recording interruption end:', interruptionId);
    if (!journeyId) return;

    const endTime = new Date();
    const { data: interruption } = await supabase
      .from('journey_interruptions')
      .select()
      .eq('id', interruptionId)
      .single();

    console.log('Interruption:', interruption);
    if (interruption) {
      const startTime = parseISO(interruption.start_time);
      const delayInSeconds = differenceInSeconds(endTime, startTime);
      console.log('Delay in Seconds:', delayInSeconds);
      await supabase
        .from('journey_interruptions')
        .update({
          end_time: endTime.toISOString(),
          time_delayed_in_seconds: delayInSeconds,
        })
        .eq('id', interruptionId);

      stopInterruptionTimer();
    }
  };

  const getAllInterruptions = async () => {
    if (!journeyId) return [];

    const { data } = await supabase
      .from('journey_interruptions')
      .select()
      .eq('journey_id', journeyId)
      .order('start_time', { ascending: true });

    return data || [];
  };

  const recordCurrentStation = async (station) => {
    //console.log('==> Recording current station:', station);
    setCurrentStation(station);
    if (!journeyId) return;

    const now = new Date();
    const departureTime = addMinutes(now, 0.5); // 30 seconds stop

    await supabase.from('journey_reached_stations').insert({
      journey_id: journeyId,
      station_code: station.code,
      arrival_time: now.toISOString(),
      departure_time: departureTime.toISOString(),
    });

    await supabase
      .from('journeys')
      .update({
        previous_station: station.code,
        next_station:
          stations[stations.findIndex((s) => s.code === station.code) + 1]
            ?.code,
      })
      .eq('id', journeyId);
  };

  const recordNextStation = async (station) => {
    if (!journeyId) return;

    await supabase
      .from('journeys')
      .update({
        next_station: station.code,
      })
      .eq('id', journeyId);

    setNextStation(station);
  };
  // console.log('');
  // console.log('');
  // console.log('\n--------- HOOK ------------');
  // console.log('Current Station', currentStation);
  // console.log('Journey:', journeyId, currentStation);
  // console.log('Reached Stations:', reachedStations);
  // console.log('Interruptions:', interruptions);
  // console.log('Total Delay:', totalDelay);
  // console.log('\n--------- END HOOK ------------');

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
  };
}
