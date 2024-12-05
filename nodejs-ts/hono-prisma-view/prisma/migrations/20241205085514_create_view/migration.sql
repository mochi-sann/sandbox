-- This is an empty migration.
CREATE VIEW "todo_list_with_user" AS
SELECT
  t.id AS todo_id,
  t.title AS todo_title,
  t.description AS todo_description,
  t.is_completed AS is_completed,
  t.created_at AS created_at,
  t.updated_at AS updated_at,
  u.id AS user_id,
  u.name AS user_name,
  u.email AS user_email,
  COUNT(tt.tag_id) AS tag_count
FROM
  "todo" t
JOIN
  "user" u ON t.user_id = u.id
LEFT JOIN
  "todo_tag" tt ON t.id = tt.todo_id
GROUP BY
  t.id, u.id
  order by todo_id;
