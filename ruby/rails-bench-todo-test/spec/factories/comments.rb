FactoryBot.define do
  factory :comment do
    association :todo
    association :user
    content { "MyText" }
  end
end
