DROP 
  TABLE IF EXISTS items;
CREATE TABLE items (
  id INT not null AUTO_INCREMENT, 
  item_no text not null, 
  item_name text not null, 
  unit_price int not null, 
  PRIMARY KEY (id)
);
CREATE TABLE members (
  id INT not null AUTO_INCREMENT, 
  mailaddress TEXT not null, 
  password TEXT not null, 
  fullname TEXT, 
  zipcode TEXT, 
  address TEXT, 
  tel TET, 
  PRIMARY KEY (id)
);
CREATE TABLE orders (
  id INT not null AUTO_INCREMENT, 
  order_no TEXT notnull, 
  order_datetime TEXT not null, 
  member_id int not null, 
  fullname TEXT not null, 
  zipcode TEXT not null, 
  address TEXT not null, 
  tel TEXT not null, 
  shipping int not null, 
  total int not null, 
  PRIMARY KEY (id), 
  foreign key member_id_foreign_key (member_id) references members (id), 
  );
CREATE TABLE order_details (
  id INT not null AUTO_INCREMENT, 
  order_id int not null, 
  item_id int not null, 
  item_name TEXT not null, 
  unit_price text nut null, 
  num int nut null, 
  subtotal int not null, 
  PRIMARY KEY (id), 
  foreign key order_id_foreign_key (order_id) references orders (id), 
  foreign key item_id_foreign_key (item_id) references items (id), 
  );
