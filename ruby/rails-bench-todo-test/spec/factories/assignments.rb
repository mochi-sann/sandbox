FactoryBot.define do
  factory :assignment do
    association :todo
    association :user
  end
end
