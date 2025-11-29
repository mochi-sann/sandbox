class User < ApplicationRecord
  has_many :organization_memberships, dependent: :destroy
  has_many :organizations, through: :organization_memberships

  has_many :assignments, dependent: :destroy
  has_many :assigned_todos, through: :assignments, source: :todo

  has_many :comments, dependent: :destroy
  has_many :time_entries, dependent: :destroy
  has_many :activity_logs, dependent: :destroy

  validates :email, presence: true, uniqueness: true
  validates :name, presence: true
end
