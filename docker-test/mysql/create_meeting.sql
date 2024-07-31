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

CREATE TABLE meeting_scadules (

  id INT not null AUTO_INCREMENT, 
  date DATE not null , 
  start_time DATETIME  not null , 
  end_time DATETIME  not null , 
  meeting_room_id INT not null , 
  meeting_name TEXT not null , 
  join_members TEXT not null  , 
  memos TEXT,
  user_id INT not null , 




  foreign key user_id_foreign_key (user_id) references users (id),
  foreign key meeting_room_id_foreign_key (meeting_room_id) references meeting_rooms (id), 
  PRIMARY KEY (id)
) ;
