class TodoStatusHistory < ApplicationRecord
  belongs_to :todo
  belongs_to :changed_by_user, class_name: "User"
end
