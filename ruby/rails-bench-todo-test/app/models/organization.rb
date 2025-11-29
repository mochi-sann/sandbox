class Organization < ApplicationRecord
  has_many :organization_memberships
  has_many :users, through: :organization_memberships

  validates :name, presence: true, uniqueness: true
end
