SELECT
  t.id AS todo_id,
  t.title AS todo_title,
  t.description AS todo_description,
  t.is_completed,
  t.created_at,
  t.updated_at,
  u.id AS user_id,
  u.name AS user_name,
  u.email AS user_email,
  count(tt.tag_id) AS tag_count
FROM
  (
    (
      todo t
      JOIN "user" u ON ((t.user_id = u.id))
    )
    LEFT JOIN todo_tag tt ON ((t.id = tt.todo_id))
  )
GROUP BY
  t.id,
  u.id
ORDER BY
  t.id;