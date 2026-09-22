(function() {
  var game;
  var ui;

  var DateOptions = {hour: 'numeric',
                 minute: 'numeric',
                 second: 'numeric',
                 year: 'numeric',
                 month: 'short',
                 day: 'numeric' };

  var main = function(dendryUI) {
    ui = dendryUI;
    game = ui.game;

    window.getMoonInfo = function() {
    var now = new Date();

    // Convert current time to Julian Date
    var year = now.getUTCFullYear();
    var month = now.getUTCMonth() + 1;
    var day =
        now.getUTCDate() +
        (now.getUTCHours() +
         now.getUTCMinutes() / 60 +
         now.getUTCSeconds() / 3600) / 24;

    var y = year;
    var m = month;

    if (m <= 2) {
        y -= 1;
        m += 12;
    }

    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);

    var julianDate =
        Math.floor(365.25 * (y + 4716)) +
        Math.floor(30.6001 * (m + 1)) +
        day + B - 1524.5;

    // Known new moon: 2000-01-06 18:14 UTC
    var knownNewMoon = 2451550.25972;

    // Length of one lunar synodic cycle
    var synodicMonth = 29.530588853;

    // Moon's age in days since the last new moon
    var moonAge = (julianDate - knownNewMoon) % synodicMonth;

    if (moonAge < 0) {
        moonAge += synodicMonth;
    }

    // Number of days before/after the exact phase that
    // counts as Dark Moon or Bright Moon.
    var phaseWindow = 2.5;

    var fullMoon = synodicMonth / 2;

    // How many days until the next Dark Moon begins?
    var daysUntilDark;

    if (moonAge <= phaseWindow) {
        // Already in Dark Moon
        daysUntilDark = 0;
    } else {
        daysUntilDark = synodicMonth - moonAge - phaseWindow;

        if (daysUntilDark < 0) {
            daysUntilDark = 0;
        }
    }

    // How many days until the next Bright Moon begins?
    var daysUntilBright;

    if (moonAge >= fullMoon - phaseWindow &&
        moonAge <= fullMoon + phaseWindow) {
        // Already in Bright Moon
        daysUntilBright = 0;
    } else if (moonAge < fullMoon - phaseWindow) {
        daysUntilBright = (fullMoon - phaseWindow) - moonAge;
    } else {
        daysUntilBright =
            (synodicMonth - moonAge) +
            (fullMoon - phaseWindow);
    }

    // Determine current moon type
    var type;

    if (moonAge <= phaseWindow ||
        moonAge >= synodicMonth - phaseWindow) {
        type = "dark_moon";
    } else if (Math.abs(moonAge - fullMoon) <= phaseWindow) {
        type = "bright_moon";
    } else {
        type = "normal_moon";
    }

    // If we're already in a special moon, the next one
    // we're interested in is the *other* one.
    var daysUntilNext;

    if (type === "bright_moon") {
        daysUntilNext = Math.ceil(daysUntilDark);
    } else if (type === "dark_moon") {
        daysUntilNext = Math.ceil(daysUntilBright);
    } else {
        daysUntilNext = Math.ceil(
            Math.min(daysUntilBright, daysUntilDark)
        );
    }

    return {
        type: type,
        nextType: type === "bright_moon"
            ? "dark_moon"
            : type === "dark_moon"
                ? "bright_moon"
                : (daysUntilBright <= daysUntilDark
                    ? "bright_moon"
                    : "dark_moon"),
        daysUntilNext: daysUntilNext
    };
};

window.setCombatHand = function(active) {
  const engine = window.dendryUI.dendryEngine;

  if (!engine._normalDisplayChoices) {
    engine._normalDisplayChoices = engine.displayChoices;
  }

  if (!active) {
    engine.displayChoices = engine._normalDisplayChoices;

    const oldHand = document.getElementById('combat-hand');
    if (oldHand) {
      oldHand.remove();
    }

    return;
  }

  engine.displayChoices = function() {
    const choices = this.getCurrentChoices();

    if (!choices) {
      return this;
    }

    const content = document.getElementById('content');

    if (!content) {
      return this;
    }

    const oldHand = document.getElementById('combat-hand');
    if (oldHand) {
      oldHand.remove();
    }

    const combatChoices = [];
    const normalChoices = [];

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const choiceScene = this.game.scenes[choice.id];

      if (!choiceScene) {
        continue;
      }


      if (choiceScene.tags && choiceScene.tags.includes('combatant')) {
        choice.image = choiceScene.cardImage;
        combatChoices.push({
          choice: choice,
          index: i
        });
      } else {
        normalChoices.push(choice);
      }
    }

    if (combatChoices.length > 0) {
      const combatHand = document.createElement('div');
      combatHand.id = 'combat-hand';
      combatHand.className = 'hand';

      for (const entry of combatChoices) {
        const choice = entry.choice;
        const index = entry.index;

      const cardWrapper = document.createElement('div');
      cardWrapper.className = 'card-in-hand';

      const card = document.createElement('a');
      card.className = 'card';
      card.href = '#';

    if (choice.image) {
        const image = document.createElement('img');
        image.className = 'card-img';
        image.src = choice.image;
        image.alt = choice.title || '';
        card.appendChild(image);
      }

      const caption = document.createElement('span');
      caption.className = 'card-caption';
      caption.textContent = choice.title || choice.id;
      card.appendChild(caption);

      card.addEventListener('click', function(event) {
        event.preventDefault();

        if (!choice.canChoose) {
          return;
        }

        engine.choose(index);
      });

      cardWrapper.appendChild(card);
      combatHand.appendChild(cardWrapper);
    }

    content.appendChild(combatHand);
  }

  this.ui.displayChoices(choices);

  const choiceList = content.querySelector('ul.choices');

  if (choiceList) {
    for (const entry of combatChoices) {
      const li = choiceList.children[entry.index];

      if (li) {
        li.style.display = 'none';
      }
    }
    const dummyIndex = choices.findIndex(function(choice) {
        return choice.id === "dummy";
    });

    if (dummyIndex !== -1) {
        const li = choiceList.children[dummyIndex];

        if (li) {
            li.style.display = 'none';
        }
    }
  }

  return this;
};
};

window.showCombatDialogue = function(advisorId, text) {
  const engine = window.dendryUI.dendryEngine;
  const scene = engine.game.scenes[advisorId];

  const image = document.getElementById('combat-dialogue-image');
  const textBox = document.getElementById('combat-dialogue-text');

  if (!image || !textBox) {
    return;
  }

  if (scene && scene.cardImage) {
    image.src = scene.cardImage;
    image.style.display = '';
  } else {
    image.src = '';
    image.style.display = 'none';
  }

  textBox.textContent = '';

  const characters = Array.from(text);
  let index = 0;

  function typeNextCharacter() {
    if (index >= characters.length) {
      window.combatDialogueTyping = false;
      window.combatDialogueTimer = null;
      window.advanceCombatDialogue();
      return;
    }

    const character = characters[index];
    textBox.textContent += character;
    index++;

    let delay = 15;

    if (character === '.' || character === '!' || character === '?' || character === '…') {
      delay = 180;
    } else if (character === ',' || character === ';' || character === ':') {
      delay = 70;
    } else if (character === ' ') {
      delay = 5;
    }

    window.combatDialogueTimer = setTimeout(typeNextCharacter, delay);
  }

  window.combatDialogueTyping = true;
  typeNextCharacter();
};

window.combatCutscenes = {};
window.nextCombatCutsceneId = 1;

window.queueCombatCutscene = function(dialogues) {
    const engine = window.dendryUI.dendryEngine;
    const Q = engine.state.qualities;

    const cutsceneId = window.nextCombatCutsceneId++;

    window.combatCutscenes[cutsceneId] = {
        actor: Q.selected_combatant,
        dialogues: dialogues
    };

    console.log("[Combat cutscene queued]", cutsceneId);

    return cutsceneId;
};

window.startCombatCutscene = function(dialoguesOrId) {
    const engine = window.dendryUI.dendryEngine;
    const Q = engine.state.qualities;

    Q.cutscene_unfinished = 1;

    let dialogues;
    let actor = Q.selected_combatant;

    if (typeof dialoguesOrId === "number") {
        const cutscene = window.combatCutscenes[dialoguesOrId];

        if (!cutscene) {
            console.warn("[Combat] No cutscene found for ID", dialoguesOrId);
            return;
        }

        dialogues = cutscene.dialogues;
        actor = cutscene.actor;
    } else {
        dialogues = dialoguesOrId;
    }

    const others = (Q.combatants || []).filter(function(combatant) {
        return combatant !== actor;
    });

    window.combatDialogueQueue = dialogues.map(function(dialogue) {
        let speaker = dialogue[0];

        if (speaker === "random_other_combatant") {
            if (others.length > 0) {
                speaker = others[Math.floor(Math.random() * others.length)];
            } else {
                speaker = "doraemon";
            }
        }

        return [speaker, dialogue[1]];
    });

    window.combatDialogueIndex = 0;
    window.combatDialogueFinished = false;

    window.playNextCombatDialogue();
};

window.playNextCombatDialogue = function() {
  const queue = window.combatDialogueQueue;

  if (!queue || window.combatDialogueIndex >= queue.length) {
    window.combatDialogueQueue = null;
    window.combatDialogueIndex = 0;
    window.combatDialogueFinished = true;
    window.dendryUI.dendryEngine.state.qualities.cutscene_unfinished = 0;
    window.dendryUI.dendryEngine.choiceCache = window.dendryUI.dendryEngine._compileChoices(window.dendryUI.dendryEngine.getCurrentScene());
    window.dendryUI.dendryEngine.ui.removeChoices();
    window.dendryUI.dendryEngine.displayChoices();
    return;
  }

  const dialogue = queue[window.combatDialogueIndex];

  window.combatDialogueFinished = false;

  window.showCombatDialogue(dialogue[0], dialogue[1]);
};

window.advanceCombatDialogue = function() {
  if (window.combatDialogueTyping) {
    return;
  }

  window.combatDialogueIndex++;

  window.playNextCombatDialogue();
};

window.setSworceryUI = function(active) {
  const content = document.getElementById('content');

  if (content) {
    content.style.backgroundColor = active ? '#d8c9df' : '';
  }
};

    // Add your custom code here.
  };

  var TITLE = "Social Democracy: An Alternate History" + '_' + "Autumn Chen";

  // the url is a link to game.json
  // TODO; 
  window.loadMod = function(url) {
  };

  window.showStats = function() {
    if (window.dendryUI.dendryEngine.state.sceneId.startsWith('library')) {
        window.dendryUI.dendryEngine.goToScene('backSpecialScene');
    } else {
        window.dendryUI.dendryEngine.goToScene('library');
    }
  };
  
  window.showOptions = function() {
      var save_element = document.getElementById('options');
      window.populateOptions();
      save_element.style.display = "block";
      if (!save_element.onclick) {
          save_element.onclick = function(evt) {
              var target = evt.target;
              var save_element = document.getElementById('options');
              if (target == save_element) {
                  window.hideOptions();
              }
          };
      }
  };

  window.hideOptions = function() {
      var save_element = document.getElementById('options');
      save_element.style.display = "none";
  };

  window.disableBg = function() {
      window.dendryUI.disable_bg = true;
      document.body.style.backgroundImage = 'none';
      window.dendryUI.saveSettings();
  };

  window.enableBg = function() {
      window.dendryUI.disable_bg = false;
      window.dendryUI.setBg(window.dendryUI.dendryEngine.state.bg);
      window.dendryUI.saveSettings();
  };

  window.disableAnimate = function() {
      window.dendryUI.animate = false;
      window.dendryUI.saveSettings();
  };

  window.enableAnimate = function() {
      window.dendryUI.animate = true;
      window.dendryUI.saveSettings();
  };

  window.disableAnimateBg = function() {
      window.dendryUI.animate_bg = false;
      window.dendryUI.saveSettings();
  };

  window.enableAnimateBg = function() {
      window.dendryUI.animate_bg = true;
      window.dendryUI.saveSettings();
  };

  window.disableAudio = function() {
      window.dendryUI.toggle_audio(false);
      window.dendryUI.saveSettings();
  };

  window.enableAudio = function() {
      window.dendryUI.toggle_audio(true);
      window.dendryUI.saveSettings();
  };

  window.enableDarkmode = function() {
      window.dendryUI.dark_mode = true;
      document.body.classList.add('dark-mode');
      window.dendryUI.saveSettings();
  };
  window.disableDarkmode = function() {
      window.dendryUI.dark_mode = false;
      document.body.classList.remove('dark-mode');
      window.dendryUI.saveSettings();
  };


  // populates the checkboxes in the options view
  window.populateOptions = function() {
    var disable_bg = window.dendryUI.disable_bg;
    var animate = window.dendryUI.animate;
    var disable_audio = window.dendryUI.disable_audio;
    if (disable_bg) {
        $('#backgrounds_no')[0].checked = true;
    } else {
        $('#backgrounds_yes')[0].checked = true;
    }
    if (animate) {
        $('#animate_yes')[0].checked = true;
    } else {
        $('#animate_no')[0].checked = true;
    }
    if (disable_audio) {
        $('#audio_no')[0].checked = true;
    } else {
        $('#audio_yes')[0].checked = true;
    }
    if (window.dendryUI.dark_mode) {
        $('#dark_mode_yes')[0].checked = true;
    } else {
        $('#dark_mode_no')[0].checked = true;
    }
  };

  
  // This function allows you to modify the text before it's displayed.
  // E.g. wrapping chat-like messages in spans.
  window.displayText = function(text) {
      return text;
  };

  // This function allows you to do something in response to signals.
  window.handleSignal = function(signal, event, scene_id) {
  };
  
  // This function runs on a new page. Right now, this auto-saves.
  window.onNewPage = function() {
    var scene = window.dendryUI.dendryEngine.state.sceneId;
    if (scene != 'root' && !window.justLoaded) {
        window.dendryUI.autosave();
    }
    if (window.justLoaded) {
        window.justLoaded = false;
    }
  };

  // TODO: have some code for tabbed sidebar browsing.
  window.updateSidebar = function() {
      $('#qualities').empty();
      var scene = dendryUI.game.scenes[window.statusTab];
      dendryUI.dendryEngine._runActions(scene.onArrival);
      var displayContent = dendryUI.dendryEngine._makeDisplayContent(scene.content, true);
      $('#qualities').append(dendryUI.contentToHTML.convert(displayContent));
  };

  window.changeTab = function(newTab, tabId) {
      if (tabId == 'poll_tab' && dendryUI.dendryEngine.state.qualities.historical_mode) {
          window.alert('Polls are not available in historical mode.');
          return;
      }
      var tabButton = document.getElementById(tabId);
      var tabButtons = document.getElementsByClassName('tab_button');
      for (i = 0; i < tabButtons.length; i++) {
        tabButtons[i].className = tabButtons[i].className.replace(' active', '');
      }
      tabButton.className += ' active';
      window.statusTab = newTab;
      window.updateSidebar();
  };

  window.onDisplayContent = function() {
      window.updateSidebar();
  };

  /*
   * This function copied from the code for Infinite Space Battle Simulator
   *
   * quality - a number between max and min
   * qualityName - the name of the quality
   * max and min - numbers
   * colors - if true/1, will use some color scheme - green to yellow to red for high to low
   * */
  window.generateBar = function(quality, qualityName, max, min, colors) {
      var bar = document.createElement('div');
      bar.className = 'bar';
      var value = document.createElement('div');
      value.className = 'barValue';
      var width = (quality - min)/(max - min);
      if (width > 1) {
          width = 1;
      } else if (width < 0) {
          width = 0;
      }
      value.style.width = Math.round(width*100) + '%';
      if (colors) {
          value.style.backgroundColor = window.probToColor(width*100);
      }
      bar.textContent = qualityName + ': ' + quality;
      if (colors) {
          bar.textContent += '/' + max;
      }
      bar.appendChild(value);
      return bar;
  };


  window.justLoaded = true;
  window.statusTab = "status";
  window.dendryModifyUI = main;
  console.log("Modifying stats: see dendryUI.dendryEngine.state.qualities");

  window.onload = function() {
    window.dendryUI.loadSettings();
    window.pinnedCardsDescription = "Advisor cards - actions are only usable once per 6 months.";
  };

}());
