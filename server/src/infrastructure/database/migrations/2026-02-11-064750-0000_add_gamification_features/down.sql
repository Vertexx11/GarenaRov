ALTER TABLE missions 
DROP COLUMN difficulty,
DROP COLUMN base_points,
DROP COLUMN due_date;

ALTER TABLE brawlers 
DROP COLUMN total_points;