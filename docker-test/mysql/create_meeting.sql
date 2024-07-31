CREATE TABLE users (
  id INT not null AUTO_INCREMENT, 
  name TEXT not null  , 
  emal_address TEXT not null , 
  password TEXT not null , 
  PRIMARY KEY (id)
 ); 

CREATE TABLE meeting_rooms ( 
  id INT not null AUTO_INCREMENT, 
  name TEXT not null  , 
  max_members INT not null , 
  memos TEXT , 
  PRIMARY KEY (id)
 ); 
);


CREATE TABLE meeting_schedules (
    id INT NOT NULL AUTO_INCREMENT,
    meeting_date DATE NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    meeting_room_id INT NOT NULL,
    meeting_name TEXT NOT NULL,
    join_members TEXT NOT NULL,
    memos TEXT,
    user_id INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT user_id_foreign_key FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT meeting_room_id_foreign_key FOREIGN KEY (meeting_room_id) REFERENCES meeting_rooms (id)
);