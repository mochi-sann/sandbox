import { Project } from 'hikkaku'
import { CATCHER_A } from 'hikkaku/assets'
import { forever, getMouseX, gotoXY, switchCostumeTo, whenFlagClicked } from 'hikkaku/blocks'

const project = new Project()

const sprite1 = project.createSprite('Sprite1')
const cat1 = sprite1.addCostume({
  ...CATCHER_A,
  name: 'cat1',
})

sprite1.run(() => {
  whenFlagClicked(() => {
    gotoXY(0, 0)
    console.log('HeloowwwwwwwwwwwwwwwwwwwwwwwwSwitching costume to cat1')
    switchCostumeTo(cat1)
    forever(() => {
      gotoXY(getMouseX(), 0)
    })
  })
})

export default project
