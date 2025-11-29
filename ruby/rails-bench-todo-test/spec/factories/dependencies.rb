FactoryBot.define do
  factory :dependency do
    todo { nil }
    depends_on_todo { nil }
  end
end
