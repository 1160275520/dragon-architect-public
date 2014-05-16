/**
 * Blockly Apps: Hackcraft Graphics
 *
 * Copyright 2012 Google Inc.
 * https://blockly.googlecode.com/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview JavaScript for Blockly's Hackcraft application.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

/**
 * Create a namespace for the application.
 */
var Hackcraft = {};

// Supported languages.
BlocklyApps.LANGUAGES =
    ['en'];
BlocklyApps.LANG = BlocklyApps.getLang();

document.write('<script type="text/javascript" src="generated/' +
               BlocklyApps.LANG + '.js"></script>\n');

Hackcraft.Commands = {"move2" :  '<block type="Forward"></block> \
                                  <block type="Left"></block> \
                                  <block type="Right"></block>',
                      "move3" :  '<block type="Up"></block> \
                                  <block type="Down"></block>',
                      "place" :  '<block type="PlaceBlock"></block>',
                      "line" :   '<block type="Line"></block>',
                      "repeat" : '<block type="controls_repeat"></block>'};

Hackcraft.makeFuncs = function (num) {
    Hackcraft.Commands['call'] = '<block type="procedures_callnoreturn"> \
                                    <mutation name="MAIN"></mutation> \
                                  </block>';
    for (var i = 0; i < num; i++) {
        Hackcraft.Commands['call'] += '<block type="procedures_callnoreturn"> \
                                         <mutation name="F'+ (i+1) + '"></mutation> \
                                       </block>';
    };
}



/**
 * Initialize Blockly and the turtle.  Called on page load.
 */
Hackcraft.init = function() {
    BlocklyApps.init();

    var blocklyDiv = document.getElementById('blockly');
    var unity = document.getElementById('unityPlayer');
    var onresize = function(e) {
        var top = unity.offsetTop;
        blocklyDiv.style.top = Math.max(10, top - window.pageYOffset) + 'px';
        blocklyDiv.style.left = '788px';
        blocklyDiv.style.width = (window.innerWidth - 808) + 'px';
    };
    window.addEventListener('scroll', function() {
        onresize();
        Blockly.fireUiEvent(window, 'resize');
    });
    window.addEventListener('resize', onresize);
    onresize();

    var toolbox = document.getElementById('toolbox');
    Blockly.inject(document.getElementById('blockly'),
        {path: '',
         rtl: false,
         toolbox: toolbox,
         trashcan: true});

    var defaultXml =
        '<xml> \
          <block type="procedures_defnoreturn" x="70" y="70"> \
            <field name="NAME">MAIN</field> \
            <statement name="STACK"> \
              <block type="controls_repeat"> \
                <field name="TIMES">5</field> \
                <statement name="DO"> \
                  <block type="Forward"> \
                  <next> \
                  <block type="Forward"><next></next></block></next></block> \
                </statement> \
              </block> \
            </statement> \
          </block> \
          <block type="procedures_defnoreturn"><field name="NAME">TEST</field><statement name="STACK"></statement></block> \
        </xml>';
    BlocklyApps.loadBlocks(defaultXml);
    Blockly.updateToolbox('<xml id="toolbox" style="display: none"></xml>');
};

window.addEventListener('load', Hackcraft.init);

Hackcraft.setProgram = function(program) {
    Blockly.mainWorkspace.getTopBlocks().map(function (b) { b.dispose(); });
    console.log("setting program");
    console.log(Blockly.UnityJSON.XMLOfJSON(program));
    BlocklyApps.loadBlocks(Blockly.UnityJSON.XMLOfJSON(program));
    var blocks = Blockly.mainWorkspace.getTopBlocks();
    for (var i = 0; i < blocks.length; i++) {
        blocks[i].setEditable(false);
        blocks[i].setDeletable(false);
    };
}

Hackcraft.setTools = function(levelInfo) {
    // var procedureXML = '<xml><block type="procedures_defnoreturn" x="70" y="70"><field name="NAME">MAIN</field></block>';
    // for (var i = 0; i < levelInfo["funcs"]; i++) {
    //     procedureXML += '<block type="procedures_defnoreturn" x="' + (270 + 200*i) + '" y="70"><field name="NAME">F' + (i+1) + '</field></block>';
    // }
    
    
    console.log("updating toolbox");
    var toolXML = '<xml id="toolbox" style="display: none">';
    Hackcraft.makeFuncs(levelInfo["funcs"]);
    for (var command in levelInfo["commands"]) {
        if (Hackcraft.Commands[command] && levelInfo["commands"][command]) {
            toolXML += Hackcraft.Commands[command];
        }
    }
    toolXML += '</xml>';
    console.log(toolXML);
    Blockly.updateToolbox(toolXML);
}

/**
 * Execute the user's code.  Heaven help us...
 */
Hackcraft.getProgram = function() {
    var topBlocks = Blockly.mainWorkspace.getTopBlocks(true);
    Blockly.UnityJSON.idCounter_ = Math.max.apply(null, Blockly.mainWorkspace.getAllBlocks().map(function (x, i, a) {return Number(x.id)}));
    var program = {};
    // iterate over top-level blocks
    for (var i = 0; i < topBlocks.length; i++) {
        var block = topBlocks[i];
        // process each procedure
        if (block.type === "procedures_defnoreturn") {
            program[block.getFieldValue("NAME")] = {};
            var fn = program[block.getFieldValue("NAME")];
            fn['arity'] = 0;
            fn['body'] = Blockly.UnityJSON.processBody(block);
        }
    }
    return program;
};