# config/initializers/rack_mini_profiler.rb
if Rails.env.development?
  require 'rack-mini-profiler'

  # initialization is skipped so that we can control profiling explicitly
  Rack::MiniProfilerRails.initialize!(Rails.application)

  # You can customize the settings here
  # Rack::MiniProfiler.config.position = 'bottom-left'
  # Rack::MiniProfiler.config.start_hidden = true
end
