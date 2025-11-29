json.extract! todo, :id, :title, :completed, :created_at, :updated_at

json.project do
  json.name todo.project&.name
end

json.category do
  json.name todo.category&.name
end

json.tags todo.tags do |tag|
  json.name tag.name
  json.color tag.color
end

json.users todo.users do |user|
  json.name user.name
  json.email user.email
end

json.url todo_url(todo, format: :json)