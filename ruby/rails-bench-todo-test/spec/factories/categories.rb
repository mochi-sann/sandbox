FactoryBot.define do
  factory :category do
    name { "MyString" }
    association :project
  end
end
