-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create trains table
CREATE TABLE IF NOT EXISTS trains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  train_code TEXT NOT NULL UNIQUE,
  train_type TEXT,
  capacity INTEGER,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stations table
CREATE TABLE IF NOT EXISTS stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location_coordinates POINT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create crew members table
CREATE TABLE IF NOT EXISTS crew_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  employee_id TEXT UNIQUE,
  contact_number TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create journeys table
CREATE TABLE IF NOT EXISTS journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  train_code TEXT NOT NULL REFERENCES trains(train_code) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'In Progress',
  previous_station TEXT REFERENCES stations(code),
  next_station TEXT REFERENCES stations(code),
  last_interruption_time TIMESTAMP WITH TIME ZONE,
  last_interruption_reason TEXT,
  last_resumed_time TIMESTAMP WITH TIME ZONE,
  total_delay_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create journey_crew table (many-to-many relationship between journeys and crew)
CREATE TABLE IF NOT EXISTS journey_crew (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  shift TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(journey_id, crew_member_id)
);

-- Create journey_interruptions table
CREATE TABLE IF NOT EXISTS journey_interruptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  interruption_reason TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  time_delayed_in_seconds INTEGER DEFAULT 0,
  station_code TEXT REFERENCES stations(code),
  location_description TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create journey_reached_stations table
CREATE TABLE IF NOT EXISTS journey_reached_stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  station_code TEXT NOT NULL REFERENCES stations(code),
  arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
  departure_time TIMESTAMP WITH TIME ZONE,
  scheduled_arrival_time TIMESTAMP WITH TIME ZONE,
  scheduled_departure_time TIMESTAMP WITH TIME ZONE,
  delay_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(journey_id, station_code)
);

-- Create journey_schedule table
CREATE TABLE IF NOT EXISTS journey_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  station_code TEXT NOT NULL REFERENCES stations(code),
  scheduled_arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  order_number INTEGER NOT NULL,
  run_time_minutes INTEGER,
  accumulative_time_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(journey_id, station_code, order_number)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_journeys_train_code ON journeys(train_code);
CREATE INDEX IF NOT EXISTS idx_journeys_status ON journeys(status);
CREATE INDEX IF NOT EXISTS idx_journey_interruptions_journey_id ON journey_interruptions(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_interruptions_start_time ON journey_interruptions(start_time);
CREATE INDEX IF NOT EXISTS idx_journey_reached_stations_journey_id ON journey_reached_stations(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_reached_stations_station_code ON journey_reached_stations(station_code);
CREATE INDEX IF NOT EXISTS idx_journey_schedule_journey_id ON journey_schedule(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_schedule_order_number ON journey_schedule(order_number);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables to update updated_at column
CREATE TRIGGER update_trains_updated_at
BEFORE UPDATE ON trains
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stations_updated_at
BEFORE UPDATE ON stations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crew_members_updated_at
BEFORE UPDATE ON crew_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journeys_updated_at
BEFORE UPDATE ON journeys
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_crew_updated_at
BEFORE UPDATE ON journey_crew
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_interruptions_updated_at
BEFORE UPDATE ON journey_interruptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_reached_stations_updated_at
BEFORE UPDATE ON journey_reached_stations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_schedule_updated_at
BEFORE UPDATE ON journey_schedule
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create view for active journeys with their current status
CREATE OR REPLACE VIEW active_journeys_view AS
SELECT 
  j.id AS journey_id,
  j.train_code,
  j.start_time,
  j.status,
  j.previous_station,
  ps.name AS previous_station_name,
  j.next_station,
  ns.name AS next_station_name,
  j.total_delay_minutes,
  (SELECT COUNT(*) FROM journey_interruptions ji WHERE ji.journey_id = j.id) AS total_interruptions,
  (SELECT COUNT(*) FROM journey_interruptions ji WHERE ji.journey_id = j.id AND ji.end_time IS NULL) AS active_interruptions,
  (SELECT COUNT(*) FROM journey_reached_stations jrs WHERE jrs.journey_id = j.id) AS stations_reached
FROM 
  journeys j
LEFT JOIN 
  stations ps ON j.previous_station = ps.code
LEFT JOIN 
  stations ns ON j.next_station = ns.code
WHERE 
  j.status != 'Completed';

-- Create function to calculate journey progress percentage
CREATE OR REPLACE FUNCTION calculate_journey_progress(journey_id UUID)
RETURNS FLOAT AS $$
DECLARE
  total_stations INTEGER;
  reached_stations INTEGER;
  progress FLOAT;
BEGIN
  -- Get total number of stations in journey schedule
  SELECT COUNT(*) INTO total_stations
  FROM journey_schedule
  WHERE journey_id = $1;
  
  -- Get number of stations reached
  SELECT COUNT(*) INTO reached_stations
  FROM journey_reached_stations
  WHERE journey_id = $1;
  
  -- Calculate progress percentage
  IF total_stations > 0 THEN
    progress := (reached_stations::FLOAT / total_stations::FLOAT) * 100;
  ELSE
    progress := 0;
  END IF;
  
  RETURN progress;
END;
$$ LANGUAGE plpgsql;

-- Create function to update journey status when all stations are reached
CREATE OR REPLACE FUNCTION update_journey_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_stations INTEGER;
  reached_stations INTEGER;
BEGIN
  -- Get total number of stations in journey schedule
  SELECT COUNT(*) INTO total_stations
  FROM journey_schedule
  WHERE journey_id = NEW.journey_id;
  
  -- Get number of stations reached
  SELECT COUNT(*) INTO reached_stations
  FROM journey_reached_stations
  WHERE journey_id = NEW.journey_id;
  
  -- If all stations reached, mark journey as completed
  IF reached_stations >= total_stations AND total_stations > 0 THEN
    UPDATE journeys
    SET status = 'Completed', end_time = NOW()
    WHERE id = NEW.journey_id AND status != 'Completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update journey completion status
CREATE TRIGGER update_journey_completion_trigger
AFTER INSERT OR UPDATE ON journey_reached_stations
FOR EACH ROW
EXECUTE FUNCTION update_journey_completion();

-- Create function to update total delay minutes in journeys table
CREATE OR REPLACE FUNCTION update_journey_total_delay()
RETURNS TRIGGER AS $$
DECLARE
  total_delay INTEGER;
BEGIN
  -- Calculate total delay from all interruptions
  SELECT COALESCE(SUM(time_delayed_in_seconds) / 60, 0) INTO total_delay
  FROM journey_interruptions
  WHERE journey_id = NEW.journey_id;
  
  -- Update the journeys table
  UPDATE journeys
  SET total_delay_minutes = total_delay
  WHERE id = NEW.journey_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update total delay
CREATE TRIGGER update_journey_total_delay_trigger
AFTER INSERT OR UPDATE OF time_delayed_in_seconds ON journey_interruptions
FOR EACH ROW
EXECUTE FUNCTION update_journey_total_delay();

-- Sample data insertion for testing (uncomment if needed)
/*
-- Insert sample trains
INSERT INTO trains (train_code, train_type, capacity) VALUES
('8903', 'Passenger', 500),
('7201', 'Express', 350),
('6104', 'Commuter', 600);

-- Insert sample stations (using your existing station data)
INSERT INTO stations (code, name) VALUES
('KAZ', 'KASERNE'),
('JUP', 'JUPITER'),
('RFI', 'REFINERY')
-- Add more stations as needed
;

-- Insert sample crew members
INSERT INTO crew_members (name, role, employee_id) VALUES
('John Smith', 'Driver', 'EMP001'),
('Sarah Johnson', 'Conductor', 'EMP002'),
('Mike Brown', 'Assistant', 'EMP003');
*/

-- Migration script to create and populate the stations table
DROP TABLE IF EXISTS stations CASCADE;
-- First, create the stations table if it doesn't exist
CREATE TABLE IF NOT EXISTS stations (
    code VARCHAR(5) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    order_number INTEGER NOT NULL,  -- Changed from "order" to "order_number" to avoid SQL reserved keyword
    arrival_time TIME NOT NULL,
    departure_time TIME NOT NULL,
    run_time VARCHAR(10) NOT NULL,
    accumulative_time VARCHAR(10) NOT NULL
);

-- Clear existing data to avoid duplicates
DELETE FROM stations;

-- Insert all stations from the train data
INSERT INTO stations (code, name, order_number, arrival_time, departure_time, run_time, accumulative_time) VALUES
('KAZ', 'KASERNE', 1, '04:54', '05:06', '00:50', '00:50'),
('JUP', 'JUPITER', 3, '05:06', '05:06', '00:12', '00:12'),
('RFI', 'REFINERY', 5, '05:12', '05:12', '00:06', '00:18'),
('IDI', 'INDIA', 7, '05:16', '05:16', '00:04', '00:22'),
('GSW', 'GERMISTONWEST', 9, '05:19', '05:19', '00:03', '00:25'),
('GMS', 'GERMISTONSOUT', 11, '05:25', '05:25', '00:06', '00:31'),
('GRM', 'GERMISTONLAKE', 13, '05:28', '05:28', '00:03', '00:34'),
('WBR', 'WEBBER', 15, '05:32', '05:32', '00:04', '00:38'),
('PHL', 'PARKHILL', 17, '05:35', '05:35', '00:03', '00:41'),
('EBG', 'ELSBURG', 19, '05:38', '05:38', '00:03', '00:44'),
('DAA', 'DALLAS', 21, '05:41', '05:41', '00:03', '00:47'),
('WTL', 'WATTLES', 23, '05:44', '05:44', '00:03', '00:50'),
('UNN', 'UNION', 25, '05:49', '05:49', '00:05', '00:55'),
('RDP', 'ROOIKOP', 27, '05:58', '05:58', '00:09', '01:04'),
('MPR', 'MAPLETON', 29, '06:07', '06:07', '00:09', '01:13'),
('RLL', 'RIETVALLEI', 31, '06:15', '06:15', '00:08', '01:21'),
('GNY', 'GLENROY', 33, '06:19', '06:19', '00:04', '01:25'),
('DSK', 'DRIEMANSKAP', 35, '06:27', '06:27', '00:07', '01:33'),
('KYD', 'KAYDALE', 37, '06:37', '06:37', '00:10', '01:43'),
('KOT', 'KLIPPOORTJIE', 39, '06:42', '06:42', '00:05', '01:48'),
('HGR', 'HEIDELBERGT', 41, '06:46', '06:46', '00:04', '01:52'),
('KXL', 'KRAAL', 43, '06:55', '06:55', '00:09', '02:01'),
('SYU', 'SPRUYTSRUS', 45, '07:06', '07:06', '00:11', '02:12'),
('FTA', 'FORTUNA', 47, '07:17', '07:17', '00:11', '02:23'),
('BOR', 'BALFOURNORTH', 49, '07:27', '07:27', '00:09', '02:33'),
('SCW', 'SPRUCEWELL', 51, '07:38', '07:38', '00:11', '02:44'),
('GDR', 'GREYLINGSTAD', 53, '07:51', '07:51', '00:13', '02:57'),
('TKW', 'TEAKWORTH', 55, '08:02', '08:02', '00:11', '03:08'),
('BPT', 'BEYTELPLAATS', 57, '08:10', '08:10', '00:08', '03:16'),
('VAL', 'VAL', 59, '08:19', '08:19', '00:09', '03:25'),
('CDM', 'CEDARMONT', 61, '08:28', '08:28', '00:09', '03:34'),
('HLE', 'HOLMDENE', 63, '08:37', '08:37', '00:09', '03:43'),
('EMT', 'ELMTREE', 65, '08:49', '08:49', '00:11', '03:55'),
('SNR', 'STANDERTON', 67, '09:05', '09:05', '00:16', '04:11'),
('FIR', 'FIRHAM', 69, '09:12', '09:12', '00:07', '04:18'),
('KMI', 'KROMDRAAI', 71, '09:25', '09:25', '00:12', '04:31'),
('KHL', 'KANONHEUWEL', 73, '09:33', '09:33', '00:08', '04:39'),
('PRD', 'PLATRAND', 75, '09:42', '09:42', '00:09', '04:48'),
('RHF', 'RUSTHOF', 77, '09:52', '09:52', '00:10', '04:58'),
('KPA', 'KOPPIEALLEEN', 79, '09:59', '09:59', '00:06', '05:05'),
('PEK', 'PERDEKOP', 81, '10:05', '10:05', '00:06', '05:11'),
('EPT', 'ELANDSPOORT', 83, '10:12', '10:12', '00:07', '05:18'),
('PMD', 'PALMFORD', 85, '10:18', '10:18', '00:06', '05:24'),
('BWK', 'BEECHWICK', 87, '10:26', '10:26', '00:08', '05:32'),
('SDU', 'SANDSPRUIT', 89, '10:36', '10:36', '00:10', '05:42'),
('VUS', 'VOORUITSIG', 91, '10:51', '10:51', '00:15', '05:57'),
('CVS', 'CLAVIS', 93, '11:07', '11:07', '00:16', '06:13'),
('LGK', 'LANGSNEK', 95, '11:15', '11:15', '00:07', '06:21'),
('MPP', 'MOUNTPROSPECT', 97, '11:29', '11:29', '00:14', '06:35'),
('IGO', 'INGOGO', 99, '11:57', '11:57', '00:28', '07:03'),
('CTF', 'CLONTARF', 101, '12:08', '12:08', '00:11', '07:14'),
('WKM', 'WYKOM', 103, '12:20', '12:20', '00:12', '07:26'),
('SLL', 'SIGNALHILL', 105, '12:29', '12:29', '00:09', '07:35'),
('NCR', 'NCS-STASIE', 107, '12:37', '12:37', '00:08', '07:43'),
('NCS', 'NEWCASTLE', 109, '12:38', '13:09', '00:01', '07:44'),
('NGN', 'NGAGANE', 111, '13:30', '13:30', '00:21', '08:05'),
('BLG', 'BALLENGEICH', 113, '13:35', '13:35', '00:05', '08:10'),
('DHR', 'DANNHAUSER', 115, '13:59', '13:59', '00:23', '08:34'),
('HSP', 'HATTINGSPRUIT', 117, '14:12', '14:12', '00:13', '08:47'),
('GJO', 'GLENCOE', 119, '14:36', '14:36', '00:24', '09:11'),
('UTK', 'UITHOEK', 121, '14:58', '14:58', '00:22', '09:33'),
('WBK', 'WASBANK', 123, '15:07', '15:07', '00:09', '09:42'),
('WSN', 'WESSELSNEK', 125, '15:17', '15:17', '00:10', '09:52'),
('ELL', 'ELANDSLAAGTE', 127, '15:31', '15:31', '00:13', '10:06'),
('PPW', 'PEPWORTH', 129, '15:42', '15:42', '00:11', '10:17'),
('DSL', 'DANSKRAAL', 131, '16:05', '16:05', '00:23', '10:40'),
('LAY', 'DSL-LADYSMITH(N)', 133, '16:08', '16:08', '00:03', '10:43'),
('UMB', 'UMBULWANA', 135, '16:18', '16:18', '00:10', '10:53'),
('PIT', 'PIETERS', 137, '16:25', '16:25', '00:06', '11:00'),
('CSO', 'COLENSO', 139, '16:37', '16:37', '00:12', '11:12'),
('CVL', 'CHIEVELEY', 141, '16:49', '16:49', '00:12', '11:24'),
('FRH', 'FRERE', 143, '17:00', '17:00', '00:10', '11:35'),
('ENE', 'ENNERSDALE', 145, '17:12', '17:12', '00:12', '11:47'),
('ECT', 'ESTCOURT', 147, '17:23', '17:23', '00:11', '11:58'),
('BCH', 'BEACONHILL', 149, '17:35', '17:35', '00:12', '12:10'),
('LOW', 'LOWLANDS', 151, '17:42', '17:42', '00:07', '12:17'),
('HCT', 'HIDCOTE', 153, '17:57', '17:57', '00:14', '12:32'),
('MRR', 'MOOIRIVIER', 155, '18:05', '18:05', '00:08', '12:40'),
('ROA', 'ROSETTA', 157, '18:17', '18:17', '00:12', '12:52'),
('NRP', 'NOTTINGHAMROA', 159, '18:24', '18:24', '00:07', '12:59'),
('BGN', 'BALGOWAN', 161, '18:47', '18:47', '00:23', '13:22'),
('LGO', 'LIDGETTON', 163, '18:59', '18:59', '00:11', '13:34'),
('DRE', 'DARGLE', 165, '19:05', '19:05', '00:06', '13:40'),
('LIR', 'LIONSRIVER', 167, '19:12', '19:12', '00:06', '13:47'),
('TDI', 'TWEEDIE', 169, '19:20', '19:20', '00:08', '13:55'),
('MRV', 'MERRIVALE', 171, '19:30', '19:30', '00:09', '14:05'),
('CDA', 'CEDARA(N)', 173, '19:37', '19:37', '00:07', '14:12'),
('BHN', 'BOUGHTON', 175, '20:04', '20:04', '00:27', '14:39'),
('PZB', 'PIETERMARITZB', 177, '20:17', '20:38', '00:13', '14:52'),
('NPR', 'NAPIER (N)', 179, '20:46', '20:46', '00:08', '15:00'),
('PNC', 'PENTRICH', 181, '20:50', '20:50', '00:04', '15:04'),
('ASR', 'ASHBURTON', 183, '21:02', '21:02', '00:12', '15:16'),
('ULS', 'UMLAASROAD', 185, '21:15', '21:15', '00:12', '15:29'),
('CAP', 'CAMPERDOWN', 187, '21:19', '21:19', '00:04', '15:33'),
('COR', 'CATORIDGE', 189, '21:27', '21:47', '00:07', '15:41'),
('GDL', 'GEORGEDALE', 191, '22:07', '22:07', '00:20', '16:01'),
('KTA', 'KWATANDAZA', 193, '22:10', '22:10', '00:03', '16:04'),
('HDE', 'HAMMARSDALE', 195, '22:17', '22:17', '00:06', '16:11'),
('CFD', 'CLIFFDALE', 197, '22:28', '22:28', '00:11', '16:22'),
('NNI', 'NSHONGWENI', 199, '22:38', '22:38', '00:10', '16:32'),
('DLE', 'DELVILLEWOOD', 201, '22:43', '22:43', '00:05', '16:37'),
('KNZ', 'KWANDENGEZI', 203, '22:51', '22:51', '00:08', '16:45'),
('DAS', 'DASSENHOEK', 205, '22:55', '22:55', '00:04', '16:49'),
('SNU', 'SITUNDUHILLS', 207, '22:58', '22:58', '00:03', '16:52'),
('TWD', 'THORNWOOD', 209, '23:02', '23:02', '00:04', '16:56'),
('MRH', 'MARIANNHILL', 211, '23:08', '23:08', '00:05', '17:02'),
('KRW', 'KLAARWATER', 213, '23:14', '23:14', '00:06', '17:08'),
('SCS', 'SHALLCROSS', 215, '23:21', '23:21', '00:06', '17:15'),
('BTQ', 'BURLINGTON', 217, '23:27', '23:27', '00:06', '17:21'),
('CAV', 'CAVENDISH', 219, '23:30', '23:30', '00:03', '17:24'),
('MTV', 'MOUNTVERNON', 221, '23:38', '23:38', '00:07', '17:32'),
('BTH', 'BOOTH', 223, '23:46', '23:46', '00:08', '17:40'),
('CWD', 'CLAIRWOOD', 225, '23:51', '23:51', '00:05', '17:45'),
('JBS', 'JACOBS', 227, '23:56', '23:56', '00:05', '17:50'),
('WWH', 'WENTWORTHPARK', 229, '00:00', '00:00', '00:04', '17:54'),
('KGX', 'KINGSREST', 231, '00:12', '00:12', '00:12', '18:06');

-- Create an index on the order_number for efficient sorting
CREATE INDEX IF NOT EXISTS idx_stations_order ON stations(order_number);

-- Verify the data was inserted correctly
SELECT COUNT(*) AS total_stations FROM stations;