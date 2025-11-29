require_relative "../config/environment"
require 'benchmark/ips'

# Create a session to simulate requests
app = Rails.application
session = ActionDispatch::Integration::Session.new(app)

puts "Benchmarking TodosController (N+1 vs Optimized)..."
puts "Testing with 50 items per page (fetching associated Project, Category, and Tags)"

# Warmup requests
session.get "/todos"
session.get "/todos/optimized"
session.get "/todos.json"
session.get "/todos/optimized.json"

Benchmark.ips do |x|
  x.config(time: 5, warmup: 2)

  x.report("HTML: N+1") do
    session.get "/todos"
  end

  x.report("HTML: Optimized") do
    session.get "/todos/optimized"
  end
  
  x.compare!
end

puts "\n--- JSON Benchmark ---\n"

Benchmark.ips do |x|
  x.config(time: 5, warmup: 2)

  x.report("JSON: N+1") do
    session.get "/todos.json"
  end

  x.report("JSON: Optimized") do
    session.get "/todos/optimized.json"
  end

  x.compare!
end
