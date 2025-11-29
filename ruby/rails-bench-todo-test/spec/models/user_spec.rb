require 'rails_helper'

RSpec.describe User, type: :model do
  it { should validate_presence_of(:email) }
  it { should validate_uniqueness_of(:email) }
  it { should validate_presence_of(:name) }
  it { should have_many(:organization_memberships) }
  it { should have_many(:organizations).through(:organization_memberships) }
end
