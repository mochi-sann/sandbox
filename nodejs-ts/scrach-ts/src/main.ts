import { Project } from 'hikkaku'
import {
  addToList,
  and,
  broadcastAndWait,
  changeVariableBy,
  deleteAllOfList,
  equals,
  getItemNumOfList,
  getItemOfList,
  getVariable,
  gt,
  ifElse,
  ifThen,
  join,
  length,
  letterOf,
  not,
  or,
  repeatUntil,
  say,
  setVariableTo,
  showList,
  showVariable,
  whenBroadcastReceived,
  whenFlagClicked,
  whenKeyPressed,
} from 'hikkaku/blocks'

const project = new Project()
const stage = project.stage

const parseTrigger = 'json_parse'
const lookupTrigger = 'json_lookup'

const jsonInput = stage.createVariable(
  'jsonInput',
  '{"name":"Scratch","version":3,"flags":[true,false,null],"nested":{"x":1}}',
)
const jsonParseStatus = stage.createVariable('jsonParseStatus', 'idle')
const jsonError = stage.createVariable('jsonError', '')
const jsonCursor = stage.createVariable('jsonCursor', 1)
const jsonDone = stage.createVariable('jsonDone', 0)
const jsonNestedDone = stage.createVariable('jsonNestedDone', 0)
const jsonEscaped = stage.createVariable('jsonEscaped', 0)
const jsonInString = stage.createVariable('jsonInString', 0)
const jsonObjDepth = stage.createVariable('jsonObjDepth', 0)
const jsonArrDepth = stage.createVariable('jsonArrDepth', 0)
const jsonCh = stage.createVariable('jsonCh', '')
const jsonKeyBuffer = stage.createVariable('jsonKeyBuffer', '')
const jsonValueBuffer = stage.createVariable('jsonValueBuffer', '')
const jsonValueType = stage.createVariable('jsonValueType', '')
const jsonQueryKey = stage.createVariable('jsonQueryKey', 'name')
const jsonQueryValue = stage.createVariable('jsonQueryValue', '')
const jsonQueryIndex = stage.createVariable('jsonQueryIndex', 0)

const jsonKeys = stage.createList('jsonKeys', [])
const jsonValues = stage.createList('jsonValues', [])
const jsonTypes = stage.createList('jsonTypes', [])

const inputLength = () => length(getVariable(jsonInput))
const cursorPastEnd = () => gt(getVariable(jsonCursor), inputLength())
const currentChar = () => letterOf(getVariable(jsonCursor), getVariable(jsonInput))
const isWhitespaceAtCursor = () =>
  or(
    or(equals(currentChar(), ' '), equals(currentChar(), '\n')),
    or(equals(currentChar(), '\t'), equals(currentChar(), '\r')),
  )
const isWhitespaceInCharBuffer = () =>
  or(
    or(equals(getVariable(jsonCh), ' '), equals(getVariable(jsonCh), '\n')),
    or(equals(getVariable(jsonCh), '\t'), equals(getVariable(jsonCh), '\r')),
  )
const skipWhitespace = () => {
  repeatUntil(or(cursorPastEnd(), not(isWhitespaceAtCursor())), () => {
    changeVariableBy(jsonCursor, 1)
  })
}
const setParseError = (message: string) => {
  setVariableTo(jsonParseStatus, 'error')
  setVariableTo(jsonError, message)
}

stage.run(() => {
  whenFlagClicked(() => {
    showVariable(jsonInput)
    showVariable(jsonParseStatus)
    showVariable(jsonError)
    showVariable(jsonQueryKey)
    showVariable(jsonQueryValue)
    showList(jsonKeys)
    showList(jsonValues)
    showList(jsonTypes)
    broadcastAndWait(parseTrigger)
    broadcastAndWait(lookupTrigger)
  })

  whenKeyPressed('p', () => {
    broadcastAndWait(parseTrigger)
  })

  whenKeyPressed('l', () => {
    broadcastAndWait(lookupTrigger)
  })

  whenBroadcastReceived(parseTrigger, () => {
    setVariableTo(jsonParseStatus, 'parsing')
    setVariableTo(jsonError, '')
    setVariableTo(jsonCursor, 1)
    setVariableTo(jsonDone, 0)
    deleteAllOfList(jsonKeys)
    deleteAllOfList(jsonValues)
    deleteAllOfList(jsonTypes)

    skipWhitespace()
    ifElse(cursorPastEnd(), () => {
      setParseError('input is empty')
    }, () => {
      ifElse(equals(currentChar(), '{'), () => {
        changeVariableBy(jsonCursor, 1)
        repeatUntil(
          or(equals(getVariable(jsonDone), 1), equals(getVariable(jsonParseStatus), 'error')),
          () => {
            skipWhitespace()
            ifElse(cursorPastEnd(), () => {
              setParseError('object is not closed')
            }, () => {
              ifElse(equals(currentChar(), '}'), () => {
                setVariableTo(jsonDone, 1)
                changeVariableBy(jsonCursor, 1)
              }, () => {
                ifElse(equals(currentChar(), '"'), () => {
                  changeVariableBy(jsonCursor, 1)
                  setVariableTo(jsonKeyBuffer, '')
                  setVariableTo(jsonEscaped, 0)
                  repeatUntil(or(cursorPastEnd(), and(equals(currentChar(), '"'), equals(getVariable(jsonEscaped), 0))), () => {
                    ifElse(equals(getVariable(jsonEscaped), 1), () => {
                      setVariableTo(jsonKeyBuffer, join(getVariable(jsonKeyBuffer), currentChar()))
                      setVariableTo(jsonEscaped, 0)
                    }, () => {
                      ifElse(equals(currentChar(), '\\'), () => {
                        setVariableTo(jsonEscaped, 1)
                      }, () => {
                        setVariableTo(jsonKeyBuffer, join(getVariable(jsonKeyBuffer), currentChar()))
                      })
                    })
                    changeVariableBy(jsonCursor, 1)
                  })

                  ifElse(cursorPastEnd(), () => {
                    setParseError('unterminated key string')
                  }, () => {
                    changeVariableBy(jsonCursor, 1)
                    skipWhitespace()
                    ifElse(cursorPastEnd(), () => {
                      setParseError('expected ":" after key')
                    }, () => {
                      ifElse(equals(currentChar(), ':'), () => {
                        changeVariableBy(jsonCursor, 1)
                        skipWhitespace()
                        ifElse(cursorPastEnd(), () => {
                          setParseError('value is missing')
                        }, () => {
                          setVariableTo(jsonValueBuffer, '')
                          ifElse(equals(currentChar(), '"'), () => {
                            setVariableTo(jsonValueType, 'string')
                            changeVariableBy(jsonCursor, 1)
                            setVariableTo(jsonEscaped, 0)
                            repeatUntil(or(cursorPastEnd(), and(equals(currentChar(), '"'), equals(getVariable(jsonEscaped), 0))), () => {
                              ifElse(equals(getVariable(jsonEscaped), 1), () => {
                                setVariableTo(jsonValueBuffer, join(getVariable(jsonValueBuffer), currentChar()))
                                setVariableTo(jsonEscaped, 0)
                              }, () => {
                                ifElse(equals(currentChar(), '\\'), () => {
                                  setVariableTo(jsonEscaped, 1)
                                }, () => {
                                  setVariableTo(jsonValueBuffer, join(getVariable(jsonValueBuffer), currentChar()))
                                })
                              })
                              changeVariableBy(jsonCursor, 1)
                            })
                            ifElse(cursorPastEnd(), () => {
                              setParseError('unterminated string value')
                            }, () => {
                              changeVariableBy(jsonCursor, 1)
                            })
                          }, () => {
                            ifElse(or(equals(currentChar(), '{'), equals(currentChar(), '[')), () => {
                              ifElse(equals(currentChar(), '{'), () => {
                                setVariableTo(jsonValueType, 'object')
                              }, () => {
                                setVariableTo(jsonValueType, 'array')
                              })
                              setVariableTo(jsonObjDepth, 0)
                              setVariableTo(jsonArrDepth, 0)
                              setVariableTo(jsonInString, 0)
                              setVariableTo(jsonEscaped, 0)
                              setVariableTo(jsonNestedDone, 0)
                              repeatUntil(or(cursorPastEnd(), equals(getVariable(jsonNestedDone), 1)), () => {
                                setVariableTo(jsonCh, currentChar())
                                setVariableTo(jsonValueBuffer, join(getVariable(jsonValueBuffer), getVariable(jsonCh)))

                                ifElse(equals(getVariable(jsonInString), 1), () => {
                                  ifElse(equals(getVariable(jsonEscaped), 1), () => {
                                    setVariableTo(jsonEscaped, 0)
                                  }, () => {
                                    ifElse(equals(getVariable(jsonCh), '\\'), () => {
                                      setVariableTo(jsonEscaped, 1)
                                    }, () => {
                                      ifThen(equals(getVariable(jsonCh), '"'), () => {
                                        setVariableTo(jsonInString, 0)
                                      })
                                    })
                                  })
                                }, () => {
                                  ifElse(equals(getVariable(jsonCh), '"'), () => {
                                    setVariableTo(jsonInString, 1)
                                  }, () => {
                                    ifThen(equals(getVariable(jsonCh), '{'), () => {
                                      changeVariableBy(jsonObjDepth, 1)
                                    })
                                    ifThen(equals(getVariable(jsonCh), '}'), () => {
                                      changeVariableBy(jsonObjDepth, -1)
                                    })
                                    ifThen(equals(getVariable(jsonCh), '['), () => {
                                      changeVariableBy(jsonArrDepth, 1)
                                    })
                                    ifThen(equals(getVariable(jsonCh), ']'), () => {
                                      changeVariableBy(jsonArrDepth, -1)
                                    })
                                    ifThen(and(equals(getVariable(jsonObjDepth), 0), equals(getVariable(jsonArrDepth), 0)), () => {
                                      setVariableTo(jsonNestedDone, 1)
                                    })
                                  })
                                })
                                changeVariableBy(jsonCursor, 1)
                              })
                              ifThen(equals(getVariable(jsonNestedDone), 0), () => {
                                setParseError('unterminated nested value')
                              })
                            }, () => {
                              setVariableTo(jsonValueType, 'primitive')
                              repeatUntil(or(cursorPastEnd(), or(equals(currentChar(), ','), equals(currentChar(), '}'))), () => {
                                setVariableTo(jsonCh, currentChar())
                                ifThen(not(isWhitespaceInCharBuffer()), () => {
                                  setVariableTo(jsonValueBuffer, join(getVariable(jsonValueBuffer), getVariable(jsonCh)))
                                })
                                changeVariableBy(jsonCursor, 1)
                              })
                              ifThen(equals(length(getVariable(jsonValueBuffer)), 0), () => {
                                setParseError('primitive value is empty')
                              })
                            })
                          })

                          ifThen(not(equals(getVariable(jsonParseStatus), 'error')), () => {
                            addToList(jsonKeys, getVariable(jsonKeyBuffer))
                            addToList(jsonValues, getVariable(jsonValueBuffer))
                            addToList(jsonTypes, getVariable(jsonValueType))
                            skipWhitespace()
                            ifElse(cursorPastEnd(), () => {
                              setParseError('object is not closed')
                            }, () => {
                              ifElse(equals(currentChar(), ','), () => {
                                changeVariableBy(jsonCursor, 1)
                              }, () => {
                                ifElse(equals(currentChar(), '}'), () => {
                                  setVariableTo(jsonDone, 1)
                                  changeVariableBy(jsonCursor, 1)
                                }, () => {
                                  setParseError('expected "," or "}"')
                                })
                              })
                            })
                          })
                        })
                      }, () => {
                        setParseError('expected ":" after key')
                      })
                    })
                  })
                }, () => {
                  setParseError('object key must start with "')
                })
              })
            })
          },
        )

        ifThen(not(equals(getVariable(jsonParseStatus), 'error')), () => {
          skipWhitespace()
          ifElse(cursorPastEnd(), () => {
            setVariableTo(jsonParseStatus, 'ok')
          }, () => {
            setParseError('trailing characters found')
          })
        })
      }, () => {
        setParseError('top-level JSON must start with {')
      })
    })
  })

  whenBroadcastReceived(lookupTrigger, () => {
    ifElse(equals(getVariable(jsonParseStatus), 'ok'), () => {
      setVariableTo(jsonQueryIndex, getItemNumOfList(jsonKeys, getVariable(jsonQueryKey)))
      ifElse(gt(getVariable(jsonQueryIndex), 0), () => {
        setVariableTo(jsonQueryValue, getItemOfList(jsonValues, getVariable(jsonQueryIndex)))
        say(join(join(getVariable(jsonQueryKey), ': '), getVariable(jsonQueryValue)))
      }, () => {
        setVariableTo(jsonQueryValue, '(not found)')
        say(join(join(getVariable(jsonQueryKey), ': '), getVariable(jsonQueryValue)))
      })
    }, () => {
      setVariableTo(jsonQueryValue, '')
      say(join('parse error: ', getVariable(jsonError)))
    })
  })
})

export default project
