FactoryBot.define do
  factory :project do
    sequence(:name) { |n| "Project #{n}" }
    description { "MyText" }
    association :organization
  end
end
