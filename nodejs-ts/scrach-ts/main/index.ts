import { Project } from 'hikkaku'
import { CATCHER_A } from 'hikkaku/assets'
import {
  getMouseX,
  gotoXY,
  procedureBoolean,
  procedureLabel,
  whenFlagClicked,
  forever,
  switchCostumeTo,
} from 'hikkaku/blocks'

const project = new Project()

const sprite1 = project.createSprite('Sprite1') // create sprite
const cat1 = sprite1.addCostume({
  ...CATCHER_A,
  name: 'cat1',
}) // create costume

sprite1.run(() => {
  // event blocks (hat blocks) should be inside run() directly
  whenFlagClicked(() => {
    // this scope is for when flag clicked
    gotoXY(0, 0) // go to x:0 y:0
    switchCostumeTo(cat1) // switch costume to cat1
    forever(() => {
      gotoXY(getMouseX(), 0) // follow mouse x
    }) // control block. This can nest other blocks.
  })
  // or other event blocks
})

console.log(project.toScratch()) // get Scratch project JSON
