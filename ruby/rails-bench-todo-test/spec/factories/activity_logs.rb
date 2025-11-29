FactoryBot.define do
  factory :activity_log do
    user { nil }
    entity_type { "MyString" }
    entity_id { 1 }
    action { "MyString" }
    details { "" }
  end
end
