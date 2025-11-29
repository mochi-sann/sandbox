class Tag < ApplicationRecord
  has_many :taggings
  has_many :todos, through: :taggings

  validates :name, presence: true, uniqueness: true
end
