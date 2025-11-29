FactoryBot.define do
  factory :tagging do
    association :tag
    association :todo
  end
end
