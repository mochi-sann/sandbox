require_relative "../config/environment"
require 'benchmark/ips'

# Create a session to simulate requests
app = Rails.application
session = ActionDispatch::Integration::Session.new(app)

puts "Benchmarking TodosController (HTML vs JSON)..."

# Warmup request to load everything
session.get "/todos"
session.get "/todos.json"

Benchmark.ips do |x|
  x.config(time: 5, warmup: 2)

  x.report("HTML: GET /todos") do
    session.get "/todos"
  end

  x.report("JSON: GET /todos.json") do
    session.get "/todos.json"
  end

  x.compare!
end
