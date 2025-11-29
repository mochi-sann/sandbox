require 'rails_helper'

RSpec.describe Organization, type: :model do
  it { should validate_presence_of(:name) }
  it { should validate_uniqueness_of(:name) }
  it { should have_many(:organization_memberships) }
  it { should have_many(:users).through(:organization_memberships) }
end
