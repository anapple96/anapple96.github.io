import express from 'express'
import fs from 'fs'

const router = express.Router()
const wikiUrl = 'http://bit-heroes.wikia.com/wiki/'

const setSimpleSelect = (data, index) => data.reduce((accumulator, familiar) => {
  let text = ''

  if (index === 'type') {
    text = familiar[index].replace(/[0-9.]*% /g, '')
  }
  else {
    text = familiar[index]
  }

  if (accumulator.every(type => type !== text)) {
    accumulator.push(text)
  }

  return accumulator
}, [])

const setComplexSelect = (data, index) => data.reduce((accumulator, familiar) => {
  familiar[index].forEach((element) => {
    let text = ''
    let validation = type => type !== text

    if (index === 'passiveAbility') {
      text = element.ability.replace(/[0-9.%]*/, '')
    }
    else if (index === 'skills') {
      text = element.action
    }
    else if (index === 'fusion') {
      const materials = [
        'Common Material',
        'Rare Material',
        'Epic Material',
        'Jumbo Syrum',
        'Mini Syrum',
        'Robot Sprocket',
        'Hobbit Foot',
        'Demon Juice',
        'Wet Brainz',
        'Ninja Powah',
        'Ginger Snaps',
        'Jelly Donut',
        'Ectoplasm',
        'Demon Hide',
        'Bacon',
        'Gold',
      ]

      text = element.name
      validation = type => type !== text && materials.every(material => material !== text)
    }

    if (accumulator.every(validation)) {
      accumulator.push(text)
    }
  })

  return accumulator
}, [])

const displayFamiliars = async (request, response, page) => {
  const rawData = await fs.promises.readFile(`data/${page}.json`, 'utf8')

  try {
    let data = JSON.parse(rawData)

    response.locals.selectType = setSimpleSelect(data, 'type')
    response.locals.selectSkill = setComplexSelect(data, 'skills').sort()

    if (page === 'fusions') {
      response.locals.selectPassiveAbility = setComplexSelect(data, 'passiveAbility').sort()
      response.locals.selectFusion = setComplexSelect(data, 'fusion').sort()
      response.locals.selectSchematicPlace = setSimpleSelect(data, 'schematicPlace').sort()
      // It's crappy but...
      var dataFamiliars = JSON.parse(fs.readFileSync('data/familiars.json', 'utf8'))
    }
    else {
      response.locals.selectZone = setSimpleSelect(data, 'zone').sort()
    }

    data = data.map((familiar) => {
      familiar.rawSkills = familiar.skills.map(skill => `${skill.skillPoint}|${skill.action}`)

      if (page === 'fusions') {
        familiar.rawPassiveAbilities = familiar.passiveAbility.map(passiveAbility => passiveAbility.ability)
        familiar.rawFusion = familiar.fusion.map(requisite => requisite.name)

        familiar.fusion.map((requisite) => {
          const familiar = dataFamiliars.find(element => element.name === requisite.name)
          requisite.url = 'fusions'

          if (familiar) {
            requisite.zone = `(${familiar.zone})`
            requisite.class = familiar.type.toLowerCase()
            requisite.url = 'familiars'
          }

          return requisite
        })
      }

      return familiar
    })

    response.render('layout', {
      view: page,
      title: page,
      data,
      csrfToken: request.csrfToken(),
      count: data.length,
      wikiUrl: `${wikiUrl + page}`,
    })
  }
  catch (error) {
    console.error(error)
  }
}

const distinct = (value, index, self) => {
    return self.indexOf(value) === index;
}

const setEquipSelect = (data, index) => data.reduce((accumulator, name) => {
  let text = ''

  if (index === 'passiveAbility') {
    for (let i = 0; i < data.length; i++) {
      if (data[i].passiveAbility != undefined) {
        for (let j = 0; j < data[i].passiveAbility.length; j++) {
          if (data[i].passiveAbility[j].ability != undefined) {
            accumulator.push(data[i].passiveAbility[j].ability)
          }
        }
      }
    }
  }

  //console.log(accumulator.filter(distinct));
  return accumulator.filter(distinct);
}, [])

const displayEquipments = async (request, response) => {
  const page = request.params.equipment
  const rawData = await fs.promises.readFile(`data/${page}.json`, 'utf8')

  try {
    let data = JSON.parse(rawData)
    //const readable = JSON.stringify(data, null , 4)
    //console.log(data[0])

    response.locals.selectType = setSimpleSelect(data, 'type')
    if (page === 'mainhands') {
      response.locals.selectWeaponType = setSimpleSelect(data, 'weaponType')
    }
    response.locals.selectZone = setSimpleSelect(data, 'zone')
    response.locals.selectTier = setSimpleSelect(data, 'tier')
    response.locals.selectPassiveAbility = setEquipSelect(data, 'passiveAbility').sort()

    data = data.map((item) => {
      if (page === 'mainhands') {
          if (item.passiveAbility != undefined) {
            item.rawPassiveAbilities = item.passiveAbility.map(passiveAbility => passiveAbility.ability)
          }
        }
        return item
      })

    response.render('layout', {
      view: 'equipments',
      title: page,
      data,
      csrfToken: request.csrfToken(),
      count: data.length,
      wikiUrl: `${wikiUrl + page}`,
      equipment: page,
    })
  }
  catch (error) {
    console.error(error)
  }
}

const displayMounts = async (request, response, page) => {
  const rawData = await fs.promises.readFile(`data/${page}.json`, 'utf8')

  try {
    const data = JSON.parse(rawData)

    response.locals.selectType = setSimpleSelect(data, 'type')

    response.render('layout', {
      view: page,
      title: page,
      data,
      csrfToken: request.csrfToken(),
      count: data.length,
      wikiUrl: `${wikiUrl + page}`,
    })
  }
  catch (error) {
    console.error(error)
  }
}

router.get('/', (request, response) => {
  displayFamiliars(request, response, 'familiars')
})

router.get('/familiars', (request, response) => {
  displayFamiliars(request, response, 'familiars')
})

router.get('/fusions', (request, response) => {
  displayFamiliars(request, response, 'fusions')
})

router.get('/equipments/:equipment(mainhands|offhands|heads|bodies|necklaces|rings)', (request, response) => {
  displayEquipments(request, response)
})

router.get('/mounts', (request, response) => {
  displayMounts(request, response, 'mounts')
})

export default router
