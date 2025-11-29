FactoryBot.define do
  factory :time_entry do
    user { nil }
    todo { nil }
    start_time { "2025-11-29 10:49:36" }
    end_time { "2025-11-29 10:49:36" }
    duration { 1 }
  end
end
