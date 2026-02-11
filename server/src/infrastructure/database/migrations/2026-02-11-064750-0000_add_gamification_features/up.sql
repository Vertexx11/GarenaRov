-- เพิ่มคอลัมน์ความยาก คะแนน และวันกำหนดส่ง ให้ตาราง missions
ALTER TABLE missions 
ADD COLUMN difficulty VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
ADD COLUMN base_points INTEGER NOT NULL DEFAULT 3,
ADD COLUMN due_date TIMESTAMP;

-- เพิ่มคะแนนสะสม ให้ตาราง brawlers (แทน users)
ALTER TABLE brawlers 
ADD COLUMN total_points INTEGER NOT NULL DEFAULT 0;