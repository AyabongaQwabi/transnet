'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  Train,
  User,
  Play,
  Pause,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { InterruptionModal } from './InterruptionModal';
import { DelayTimer } from './DelayTimer';
import { format } from 'date-fns';
import moment from 'moment';
import { isEmpty, isNil } from 'ramda';

const exists = (i) => !isEmpty(i) && !isNil(i);

const getTimeInMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatDuration = (minutes) => {
  const normalizedMinutes = minutes % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins
    .toString()
    .padStart(2, '0')}`;
};

const addMinutesToTime = (time, minutes) => {
  const totalMinutes = getTimeInMinutes(time) + minutes;
  return formatDuration(totalMinutes);
};

const isTimeInPast = (timeStr) => {
  const now = moment();
  const timeToCheck = moment(timeStr, 'HH:mm');
  return now.isAfter(timeToCheck);
};

export const Timeline = ({ stations, journey, crew }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expectedStation, setExpectedStation] = useState(null);
  const [trainEvents, setTrainEvents] = useState([]);
  const [expandedSegments, setExpandedSegments] = useState(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [hasStartedJourney, setHasStartedJourney] = useState(false);
  const [hasInitializedJourney, setHasInitializedJourney] = useState(false);
  const [hasPerformedInitialStart, setHasPerformedInitialStart] =
    useState(false);

  const trainStartMovementTime = stations[0].departureTime;

  const {
    journeyId,
    currentStation,
    reachedStations,
    interruptions,
    totalDelay,
    recordStationReached,
    recordInterruption,
    recordInterruptionEnd,
    recordCurrentStation,
    recordNextStation,
    getInterruptions,
    initializeJourney,
    startNewJourney,
  } = journey;

  const activeInterruption = interruptions.find((i) => !i.end_time);

  const adjustedStations = stations.map((station) => ({
    ...station,
    arrivalTime: totalDelay
      ? addMinutesToTime(station.arrivalTime, totalDelay)
      : station.arrivalTime,
    departureTime: totalDelay
      ? addMinutesToTime(station.departureTime, totalDelay)
      : station.departureTime,
  }));

  const groupedStations = adjustedStations.reduce((groups, station) => {
    const timeInMinutes = getTimeInMinutes(station.arrivalTime);
    const segmentKey = formatDuration(Math.floor(timeInMinutes / 30) * 30);

    if (!groups[segmentKey]) {
      groups[segmentKey] = [];
    }
    groups[segmentKey].push(station);
    return groups;
  }, {});

  const normalizeTimeRelativeToStart = (time, startTime) => {
    const [startHours] = startTime.split(':').map(Number);
    const [hours, minutes] = time.split(':').map(Number);

    if (hours < startHours) {
      return (hours + 24) * 60 + minutes;
    }
    return hours * 60 + minutes;
  };

  const sortTimeSegments = (events) => {
    const startTime = trainStartMovementTime;
    const sortedKeys = Object.keys(events).sort((a, b) => {
      const timeA = normalizeTimeRelativeToStart(a, startTime);
      const timeB = normalizeTimeRelativeToStart(b, startTime);
      return timeA - timeB;
    });

    const sortedEvents = {};
    sortedKeys.forEach((key) => {
      sortedEvents[key] = events[key];
    });

    return sortedEvents;
  };

  const createTimelineEvents = () => {
    console.log('create timeline events...');
    const interruptionEvents = interruptions
      ? interruptions?.flatMap((interruption) => {
          const startTimeStr = moment(interruption.start_time).format('HH:mm');
          const endTimeStr = interruption.end_time
            ? moment(interruption.end_time).format('HH:mm')
            : null;

          // Create the start event
          const events = [
            {
              time: startTimeStr,
              normalizedTime: normalizeTimeRelativeToStart(
                startTimeStr,
                trainStartMovementTime
              ),
              type: 'start',
              category: 'interruption',
              interruption,
            },
          ];

          // Only add end event if it exists
          if (endTimeStr) {
            events.push({
              time: endTimeStr,
              normalizedTime: normalizeTimeRelativeToStart(
                endTimeStr,
                trainStartMovementTime
              ),
              type: 'end',
              category: 'interruption',
              interruption,
            });
          }

          return events;
        })
      : [];

    const stationEvents = groupedStations
      ? Object.entries(groupedStations).flatMap(
          ([timeSegment, segmentStations]) =>
            segmentStations.flatMap((station) => {
              return [
                {
                  time: station.arrivalTime,
                  normalizedTime: normalizeTimeRelativeToStart(
                    station.arrivalTime,
                    trainStartMovementTime
                  ),
                  type: 'arrival',
                  category: 'station',
                  station,
                },
                {
                  time: station.departureTime,
                  normalizedTime: normalizeTimeRelativeToStart(
                    station.departureTime,
                    trainStartMovementTime
                  ),
                  type: 'departure',
                  category: 'station',
                  station,
                },
              ];
            })
        )
      : [];

    const allEvents = [...interruptionEvents, ...stationEvents].sort(
      (a, b) => a.normalizedTime - b.normalizedTime
    );

    const groupedEvents = allEvents.reduce((acc, event) => {
      const eventTime = moment(event.time, 'HH:mm');
      if (!eventTime.isValid()) {
        console.error('Invalid event time format:', event.time);
        return acc;
      }

      const minutes = normalizeTimeRelativeToStart(
        event.time,
        trainStartMovementTime
      );
      const roundedMinutes = Math.floor(minutes / 30) * 30;
      const segmentKey = formatDuration(roundedMinutes);

      if (!acc[segmentKey]) {
        acc[segmentKey] = [];
      }
      acc[segmentKey].push(event);

      return acc;
    }, {});

    // Update train events while preserving expanded segments
    const sortedEvents = sortTimeSegments(groupedEvents);
    setTrainEvents(sortedEvents);
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const newExpandedSegments = new Set();
    if (isInitialLoad && trainEvents && Object.keys(trainEvents).length > 0) {
      const currentMoment = moment();

      Object.keys(trainEvents).forEach((timeSegment) => {
        const segmentTime = moment(timeSegment, 'HH:mm');
        if (segmentTime.isAfter(currentMoment)) {
          newExpandedSegments.add(timeSegment);
        }
      });
    }

    setExpandedSegments(newExpandedSegments);
    setIsInitialLoad(false);
  }, [trainEvents, isInitialLoad]);

  useEffect(() => {
    let timerId;

    const updateData = () => {
      console.log('refreshing interval...');

      const now = new Date();
      setCurrentTime(now);

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const expected = stations.find((station) => {
        const stationTime = getTimeInMinutes(station.arrivalTime);
        const nextStation = stations[stations.indexOf(station) + 1];
        const nextStationTime = nextStation
          ? getTimeInMinutes(nextStation.arrivalTime)
          : Number.POSITIVE_INFINITY;
        return (
          currentMinutes >= stationTime && currentMinutes < nextStationTime
        );
      });

      setExpectedStation(expected);

      // Only update station-related data on interval, not UI state
      if (expected) {
        const stationIndex = stations.findIndex(
          (s) => s.code === expected.code
        );
        const nextStation = stations[stationIndex + 1];

        recordCurrentStation(expected);
        recordNextStation(nextStation);

        if (nextStation) {
          const nextStationTime = getTimeInMinutes(nextStation.arrivalTime);
          const currentTimeMinutes = getTimeInMinutes(format(now, 'HH:mm'));

          if (
            currentTimeMinutes >= nextStationTime &&
            !reachedStations.has(nextStation.code)
          ) {
            recordStationReached(nextStation);
          }
        }
      }
    };

    updateData(); // Run immediately

    timerId = setInterval(updateData, 5000);

    return () => clearInterval(timerId);
  }, [
    stations,
    reachedStations,
    recordCurrentStation,
    recordNextStation,
    recordStationReached,
  ]);

  useEffect(() => {
    // Only recreate timeline events when the underlying data changes
    // not on every timer tick
    createTimelineEvents();
  }, [interruptions, reachedStations, journeyId, stations]);

  useEffect(() => {
    getInterruptions();
  }, [journeyId]);

  useEffect(() => {
    if (exists(interruptions) && exists(groupedStations)) {
      createTimelineEvents();
    }
  }, [journeyId, interruptions, groupedStations]);

  useEffect(() => {
    if (
      stations &&
      expectedStation &&
      !hasStartedJourney &&
      !hasInitializedJourney &&
      !hasPerformedInitialStart
    ) {
      startNewJourney(expectedStation);
      setHasStartedJourney(true);
      setHasInitializedJourney(true);
      setHasPerformedInitialStart(true);
    }
  }, [
    expectedStation,
    stations,
    startNewJourney,
    hasStartedJourney,
    hasInitializedJourney,
    hasPerformedInitialStart,
  ]);

  if (!stations?.length || !crew?.length || !hasMounted) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='animate-pulse flex flex-col items-center'>
          <Train className='w-12 h-12 text-blue-500 mb-4' />
          <p className='text-gray-600'>Loading journey information...</p>
        </div>
      </div>
    );
  }

  const endCurrentInteruption = async () => {
    await recordInterruptionEnd(activeInterruption.id);
    await getInterruptions();
    createTimelineEvents();
  };

  const handleInterruption = async (reason, severity) => {
    console.log('recording interruption...', reason, severity);
    try {
      await recordInterruption(reason, severity, journeyId);
      setIsModalOpen(false);
      await getInterruptions();
      createTimelineEvents();
    } catch (error) {
      console.error('Failed to record interruption:', error);
      alert('Failed to record interruption. Please try again.');
    }
  };

  const toggleSegment = (timeSegment) => {
    setExpandedSegments((prev) => {
      const newExpandedSegments = new Set(prev);
      if (newExpandedSegments.has(timeSegment)) {
        newExpandedSegments.delete(timeSegment);
      } else {
        newExpandedSegments.add(timeSegment);
      }
      return newExpandedSegments;
    });
  };

  const getInterruptionStatusBadge = (interruption) => {
    if (!interruption.end_time) {
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-transnet-red text-white'>
          Active
        </span>
      );
    }

    const delayMinutes = Math.floor(interruption.time_delayed_in_seconds / 60);
    return (
      <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800'>
        {delayMinutes} min delay
      </span>
    );
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'high':
        return (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-transnet-red text-white'>
            High
          </span>
        );
      case 'medium':
        return (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500 text-white'>
            Medium
          </span>
        );
      case 'low':
      default:
        return (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white'>
            Low
          </span>
        );
    }
  };

  console.log('interruptions', interruptions);
  return (
    <div className='min-h-screen bg-gray-50'>
      <InterruptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleInterruption}
        currentStation={expectedStation}
      />

      <div className='max-w-7xl mx-auto px-4 py-8'>
        {/* Delay Timer Component */}
        {/* <DelayTimer
          totalDelay={totalDelay}
          activeInterruption={activeInterruption}
          className="mb-6"
          interruptions={interruptions}
        /> */}

        <div className='bg-white rounded-xl shadow-lg p-6 mb-8 transition-all duration-300 hover:shadow-xl'>
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center space-x-6'>
              <div className='bg-transnet-green/10 p-4 rounded-lg'>
                <Train className='w-10 h-10 text-transnet-green' />
              </div>
              <div>
                <h2 className='text-3xl font-bold text-transnet-red'>
                  Journey Status
                </h2>
                <div className='flex items-center mt-2 text-transnet-gray'>
                  <MapPin className='w-4 h-4 mr-2' />
                  <p>
                    {expectedStation
                      ? `Currently at: ${expectedStation.name}`
                      : 'Journey not started'}
                  </p>
                </div>
              </div>
            </div>

            <div className='flex items-center space-x-4'>
              <div className='bg-transnet-green/10 px-6 py-3 rounded-lg flex items-center'>
                <Clock className='w-5 h-5 text-transnet-green mr-3' />
                <span className='font-medium text-transnet-gray'>
                  {format(currentTime, 'HH:mm:ss')}
                </span>
              </div>

              {activeInterruption ? (
                <button
                  onClick={() => endCurrentInteruption()}
                  className='flex items-center space-x-2 px-6 py-3 bg-transnet-green text-white rounded-lg hover:bg-[#7ab522] transition-colors duration-200'
                >
                  <Play className='w-5 h-5' />
                  <span className='font-medium'>Resume Journey</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className='flex items-center space-x-2 px-6 py-3 bg-transnet-red text-white rounded-lg hover:bg-[#df3325] transition-colors duration-200'
                >
                  <Pause className='w-5 h-5' />
                  <span className='font-medium'>Interrupt Train</span>
                </button>
              )}
            </div>
          </div>

          <div className='grid grid-cols-3 gap-6'>
            {crew.map((member) => (
              <div
                key={member.id}
                className='bg-gray-50 rounded-lg p-4 flex items-center space-x-4 transition-all duration-200 hover:bg-gray-100'
              >
                <div className='bg-white p-3 rounded-md shadow-sm'>
                  <User className='w-8 h-8 text-transnet-green' />
                </div>
                <div>
                  <h3 className='font-semibold text-transnet-gray'>
                    {member.name}
                  </h3>
                  <p className='text-sm text-gray-600'>
                    {member.role} - {member.shift} Shift
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='space-y-4'>
          {Object.entries(trainEvents).map(([timeSegment, segmentStations]) => {
            const segmentTime = moment(timeSegment, 'HH:mm');
            const currentTime = moment();
            const isPastSegment = segmentTime.isBefore(currentTime);
            const isExpanded = expandedSegments.has(timeSegment);

            return (
              <div
                key={timeSegment}
                className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'hover:shadow-lg' : ''
                }`}
              >
                <button
                  onClick={() => toggleSegment(timeSegment)}
                  className={`w-full sticky top-0 ${
                    isPastSegment ? 'bg-transnet-gray' : 'bg-transnet-red'
                  } text-white py-4 px-6 flex items-center justify-between transition-colors duration-200 hover:opacity-90`}
                >
                  <div className='flex items-center space-x-3'>
                    <Calendar className='w-5 h-5' />
                    <h2 className='text-lg font-bold'>
                      {timeSegment} -{' '}
                      {formatDuration(getTimeInMinutes(timeSegment) + 30)}
                    </h2>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className='w-5 h-5' />
                  ) : (
                    <ChevronRight className='w-5 h-5' />
                  )}
                </button>

                {isExpanded && (
                  <div className='p-6 space-y-4'>
                    {segmentStations.map((event, index) => {
                      const eventTime = moment(event.time, 'HH:mm');
                      const currentTime = moment();
                      const isEventPast = eventTime.isBefore(currentTime);

                      return (
                        <div
                          key={index}
                          className={`rounded-lg p-4 transition-all duration-200 ${
                            isEventPast && event.category !== 'interruption'
                              ? 'bg-transnet-gray text-white'
                              : isEventPast && event.category === 'interruption'
                              ? 'bg-transnet-red/10'
                              : !isEventPast &&
                                event.category === 'interruption'
                              ? 'bg-transnet-red/10'
                              : 'bg-transnet-green/10'
                          }`}
                        >
                          <div className='flex justify-between items-center'>
                            <div className='space-y-2'>
                              <div className='flex items-center space-x-4'>
                                <h3 className='font-semibold text-lg'>
                                  {event.category === 'station'
                                    ? event.station.name
                                    : 'Train Interruption'}
                                </h3>
                                <span
                                  className={`text-xs font-medium px-3 py-1 rounded-full ${
                                    event.type === 'arrival' ||
                                    event.type === 'start'
                                      ? 'bg-transnet-green text-white'
                                      : 'bg-yellow-500 text-white'
                                  }`}
                                >
                                  {event.type}
                                </span>
                                {event.category === 'interruption' &&
                                  event.interruption.severity &&
                                  getSeverityBadge(event.interruption.severity)}
                              </div>
                              <p
                                className={`text-sm ${
                                  isEventPast
                                    ? 'text-gray-300'
                                    : 'text-gray-600'
                                }`}
                              >
                                {event.time}
                              </p>
                              {event.category === 'interruption' && (
                                <div className='space-y-1'>
                                  <p className='text-sm text-transnet-red'>
                                    Reason:{' '}
                                    {event.interruption.interruption_reason}
                                  </p>
                                  {event.interruption.location_description && (
                                    <p className='text-sm text-gray-600'>
                                      Location:{' '}
                                      {event.interruption.location_description}
                                    </p>
                                  )}
                                  {getInterruptionStatusBadge(
                                    event.interruption
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <span
                                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                                  isEventPast
                                    ? 'bg-transnet-gray text-white'
                                    : 'bg-transnet-green text-white'
                                }`}
                              >
                                {isEventPast ? 'Completed' : 'Scheduled'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
