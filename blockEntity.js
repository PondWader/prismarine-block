const nbt = require('prismarine-nbt')

module.exports = registry => {
  if (registry.version.type === 'pc') {
    const ChatMessage = require('prismarine-chat')(registry.version.majorVersion)

    function setSignText (block, side, text) {
      const texts = []
      if (typeof text === 'string') {
        // Sign line should look like JSON string of `{"text: "actualText"}`. Since we have plaintext, need to add in this JSON wrapper.
        texts.push(JSON.stringify(text.split('\n').map((t) => ({ text: t }))))
      } else if (Array.isArray(text)) {
        for (const t of text) {
          if (t.toJSON) { // prismarine-chat
            texts.push(JSON.stringify(t.toJSON()))
          } else if (typeof t === 'object') { // normal JS object
            texts.push(JSON.stringify(t))
          } else { // plaintext
            texts.push(JSON.stringify({ text: t }))
          }
        }
      }

      if (!block.entity) {
        block.entity = nbt.comp({
          id: nbt.string(registry.version['>=']('1.11') ? 'minecraft:sign' : 'Sign')
        })
      }

      block.entity.value[side].value.messages.value.value = texts
    }

    return {
      sign: registry.supportFeature('multiSidedSigns')
        ? {
            get blockEntity () {
              if (!this.entity) return undefined

              const getSideData = (side) => {
                return {
                  hasGlowingText: this.entity.value[side].value.has_glowing_text.value === 1,
                  color: this.entity.value[side].value.color.value,
                  lines: this.entity.value[side].value.messages.value.value.map(line => new ChatMessage(JSON.parse(line)))
                }
              }

              const frontText = getSideData('front_text')
              return {
                isWaxed: this.entity.value.is_waxed.value === 1,
                id: this.entity.value.id || 'minecraft:sign',
                front: frontText,
                back: getSideData('back_text'),

                // Backwards compatible API
                Text1: frontText.lines[0],
                Text2: frontText.lines[1],
                Text3: frontText.lines[2],
                Text4: frontText.lines[3]
              }
            },

            set signFrontText (text) {
              setSignText(this, 'front_text', text)
            },

            get signFrontText () {
              if (!this.entity) return ''
              return this.entity.value.front_text.value.messages.value.value.map(text => typeof JSON.parse(text) === 'string' ? JSON.parse(text) : new ChatMessage(JSON.parse(text)).toString()).join('\n')
            },

            set signBackText (text) {
              setSignText(this, 'back_text', text)
            },

            get signBackText () {
              if (!this.entity) return ''
              return this.entity.value.back_text.value.messages.value.value.map(text => typeof JSON.parse(text) === 'string' ? JSON.parse(text) : new ChatMessage(JSON.parse(text)).toString()).join('\n')
            },

            // Backwards compatibility
            get signText () {
              return this.signFrontText
            },
            set signText (text) {
              this.signFrontText = text
            }
          }
        : {
            get blockEntity () {
              // Compatibility for mineflayer, which changes .blockEntity for signs to contain ChatMessages instead of simplified NBT
              if (!this.entity) return undefined

              const prepareJson = (i) => {
                const data = this.entity.value[`Text${i}`].value
                if (!data || data === '') return ''
                const json = JSON.parse(data)
                if (json === null || !('text' in json)) return ''
                return json
              }

              return {
                id: this.entity.value.id || 'minecraft:sign',
                Text1: new ChatMessage(prepareJson(1)),
                Text2: new ChatMessage(prepareJson(2)),
                Text3: new ChatMessage(prepareJson(3)),
                Text4: new ChatMessage(prepareJson(4))
              }
            },

            set signText (text) {
              const texts = []
              if (typeof text === 'string') {
                // Sign line should look like JSON string of `{"text: "actualText"}`. Since we have plaintext, need to add in this JSON wrapper.
                texts.push(JSON.stringify(text.split('\n').map((t) => ({ text: t }))))
              } else if (Array.isArray(text)) {
                for (const t of text) {
                  if (t.toJSON) { // prismarine-chat
                    texts.push(JSON.stringify(t.toJSON()))
                  } else if (typeof t === 'object') { // normal JS object
                    texts.push(JSON.stringify(t))
                  } else { // plaintext
                    texts.push(JSON.stringify({ text: t }))
                  }
                }
              }

              if (!this.entity) {
                this.entity = nbt.comp({
                  id: nbt.string(registry.version['>=']('1.11') ? 'minecraft:sign' : 'Sign')
                })
              }

              Object.assign(this.entity.value, {
                Text1: nbt.string(texts[0] || ''),
                Text2: nbt.string(texts[1] || ''),
                Text3: nbt.string(texts[2] || ''),
                Text4: nbt.string(texts[3] || '')
              })
            },

            get signText () {
              if (!this.entity) {
                return ''
              }
              const texts = [this.entity.value.Text1.value, this.entity.value.Text2.value, this.entity.value.Text3.value, this.entity.value.Text4.value]
              return texts.map(text => typeof JSON.parse(text) === 'string' ? JSON.parse(text) : new ChatMessage(JSON.parse(text)).toString()).join('\n')
            }
          }
    }
  }

  if (registry.version.type === 'bedrock') {
    return {
      sign: {
        get signText () {
          if (!this.entity) {
            return ''
          }
          return this.entity.Text.value
        },

        set signText (text) {
          if (!this.entity) {
            this.entity = nbt.comp({
              id: nbt.string('Sign')
            })
          }

          Object.assign(this.entity.value, {
            Text: nbt.string(Array.isArray(text) ? text.join('\n') : text)
          })
        }
      }
    }
  }
}
