class Project < ApplicationRecord
  belongs_to :organization
  has_many :categories
  has_many :todos

  validates :name, presence: true
end
