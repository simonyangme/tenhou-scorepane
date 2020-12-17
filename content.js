/*jshint esversion:6 */
/*jslint single, browser, fudge, this */
/*global jQuery, window, chrome, MutationObserver, console */

(function () {
"use strict";

let mutationObserver;
let $ = jQuery;
let handNum = 1;
let playerName = null;
let isT4;

const paneID = 'azpspane';

const observerSettings = {
    characterData: true,
    childList: true,
    subtree: true
};

function getGamePane() {
    // check whether we've set the isT4 flag already, and if not, set it to true if we're on tenhou.net/4, else set it to false
    if (isT4 === undefined) {
        isT4 = window.location.pathname.substring(0,2) === '/4';
    }
    if (isT4) {
        return $('div.nosel:first');
    } else {
        return $('div.nosel > div.nosel.tbl:first');
    }
}

function setToObserve() {
    mutationObserver.observe(document.documentElement, observerSettings);
}

chrome.runtime.onMessage.addListener(setToObserve);

function setWidth() {
    let gamePane = getGamePane();
    $('#' + paneID).css({
        'width': $('body').width() - gamePane.width() - 40
    });
}

function scorePane() {

    // if our score pane isn't present, create it

    let pane = $('#' + paneID);
    let fontsize = '0.5em';

    if (pane.length === 0) {

        let gamePane = getGamePane();
        if (isT4) {
            gamePane.css('transform' ,'translateX(0)');
             fontsize = '1em';
        } else {
            gamePane
                .css('margin-left', 10)
                .next()
                    .css('left', 0);
        }
        pane = $('<div>').prop('id', paneID).css('fontSize', fontsize);
        $('body').append(pane);
        setWidth();
    }
    return pane;
}

function rememberPlayerName(node) {
    if (playerName !== null) {
        return;
    }
    let player;
    if (isT4) {
        player = $('.bbg5:last > span:eq(1)', node);
        if (player.length) {
            playerName = player[0].innerText;
        }
    } else {
        player = $('#sc0', node);
        if (player.length) {
            playerName = player[0].childNodes[2].innerText;
        }
    }
}

function showResult(texts) {
    scorePane()
        .prepend($('<div>')
            .html(texts)
            .prepend($('<h2>').text('Hand ' + handNum))
            )
        .prop('scrollTop', 0);

    handNum += 1;
}

function getVal(node) {
    return node.nodeValue || node.innerText;
}

function appendNodes(fromDom) {
    let toString = '';
    fromDom.childNodes.forEach(function appendOneNode(node) {
        toString += getVal(node) + ' ';
    });
    return toString;
}

function riichiHonba(node) {
    return '<span class=azpsicons>'
            + $("tr:first td:first", node)[0].innerText
            + '</span>';
}

function getOneScoreT3(node, player) {

        // #scN has childNodes containing:
        // wind, space, name, space, total score, [optional: delta]

        let totalLine = '';
        let el = $('#sc' + player, node)[0];
        let nNodes = el.childNodes.length;

        [0, 2, 4].forEach(function (idx) {
            totalLine += '<td>'
                + (idx < nNodes ? getVal(el.childNodes[idx]) : '')
                + '</td>';
        });

        if (el.childNodes.length > 5) {
            let score = getVal(el.childNodes[5]);
            totalLine =  '<tr class="'
                + (score > 0 ? 'azpsplus' : 'azpsminus')
                + '">'
                + totalLine
                + '<td>'
                + score;
        } else {
            totalLine = '<tr>' + totalLine + '<td>';
        }
        return totalLine + '</td></tr>';
}

function scoreTableT3(node) {

    let totalLine = '<table>';
    let nPlayers = 3 + ($('#sc3', node).length ? 1 : 0);
    Array.from(new Array(nPlayers).keys()).forEach(function (i) {
        totalLine += getOneScoreT3(node, i);
    });
    return totalLine + '</table>';

}

function getOneScoreT4(node, player) {
    // <div class="bbg5"><span>東</span> <span>COM</span><br>25000</div>

    let totalLine = '';
    let nNodes = node.childNodes.length;

    [0, 2, 4].forEach(function (idx) {
        totalLine += '<td>'
            + (idx < nNodes ? getVal(node.childNodes[idx]) : '')
            + '</td>';
    });

    if (node.childNodes.length > 5) {
        let score = getVal(node.childNodes[5]);
        totalLine =  '<tr class="'
            + (score > 0 ? 'azpsplus' : 'azpsminus')
            + '">'
            + totalLine
            + '<td>'
            + score;
    } else {
        totalLine = '<tr>' + totalLine + '<td>';
    }
    return totalLine + '</td></tr>';
}

function scoreTableT4(node) {

    let table = '<table>';
    let players = $('.bbg5', node);
    for (let i=0; i < players.length; i++) {        
        table += getOneScoreT4(players.eq(i)[0], i);
    }
    return table + '</table>';

}

function showExhaustiveDraw(node) {

    rememberPlayerName(node);
    let outcome;
    let block = '<h3>Draw ';
    if (isT4) {
        outcome = $('table', node);
        block += /*riichiHonba(outcome) +*/ '</h3>' + scoreTableT4(outcome);
    } else {
        outcome = node.childNodes[0].childNodes[1];
        block += riichiHonba(outcome) + '</h3>' + scoreTableT3(outcome);
    }
    showResult(block);
}

function showWin(node) {

/*
"<div class="nopp"><div class="s0"><canvas></canvas><canvas></canvas><div>
<table cellspacing="0" cellpadding="0"><tbody>
<tr><td width="50%" valign="top" align="center">
<table cellspacing="0" cellpadding="0"><tbody>
<tr><td align="left"><div class="yk">役牌 白</div></td><td align="left"><div class="hn">　1<span class="gray">飜</span></div></td></tr>
<tr><td align="left"><div class="yk">ドラ</div></td><td align="left"><div class="hn">　2<span class="gray">飜</span></div></td></tr>
<tr><td align="left"><div class="yk">赤ドラ</div></td><td align="left"><div class="hn">　2<span class="gray">飜</span></div></td></tr></tbody></table>
</td></tr>
</tbody></table>
</div>
<canvas class="nodisp" width="0" height="0"></canvas>
<div><span class="gray">滿貫</span>8000<span class="gray">点</span></div>
<div>
<table width="100%" cellspacing="0" cellpadding="0"><tbody>
<tr><td rowspan="1"><span class="gray">\ue804</span>0 <span class="gray">\ue805</span>0</td><td rowspan="2"><div class="bbg5"><span>北</span> <span>COM</span><br>25000</div></td><td rowspan="1"><span class="gray">四般東喰赤</span></td></tr>
<tr><td rowspan="2"><div class="bbg5"><span>東</span> <span>COM</span><br>25000</div></td><td rowspan="2"><div class="bbg5"><span>西</span> <span>COM</span><br>25000 <span>-8000</span></div></td></tr>
<tr><td rowspan="2"><div class="bbg5"><span>南</span> <span>ApplySci</span><br>25000 <span>+8000</span></div></td></tr>
<tr><td rowspan="1"></td><td rowspan="1"></td></tr></tbody></table>
</div><button class="btn s7" name="c5">OK</button></div>
</div>"
*/

    rememberPlayerName(node);
    let totalLine = 'Win!';
    let nYaku = 0;
    
    if (isT4) {
        // TODO
    } else {
        totalLine = appendNodes(node.children[0])  // score
            + '<br>'
            + riichiHonba(node.childNodes[2])
            + '<table>';

        // get all the yaku

        let yakuTable = $("tr:not(:has(table))", node.childNodes[1]);
        nYaku = yakuTable.length;
        yakuTable.each(function (row) {
            let hanCount = getVal(this.childNodes[1]);
            totalLine += '<tr'
                + ((hanCount.trimLeft()[0] === '0') ? ' class=azpsgrey' : '')
                + '><td>'
                + getVal(this.childNodes[0])
                + '</td><td>'
                + hanCount
                + '</td></tr>';
        });

        totalLine += '</table>' + scoreTableT3(node.childNodes[2]);
    }

    // pause so we don't spoil any uradora surprise
    setTimeout(() => showResult(totalLine), 500 + nYaku * 1000);
}

function handleEnd(node) {

    let winner;
    if (isT4) {
        winner = $('.bbg5:first')[0].childNodes[0].nodeValue;
    } else {
        winner = $('table > tbody > tr > td:first', node)[0]
            .childNodes[0]
            .nodeValue;
    }
    if (winner !== playerName || $('div.tbc.bgb:contains(Exit)').length || $('button:contains(Exit)').length) {
        return;
    }
    // if we are here, then the live player has won
    // TODO do something nice to mark the win; add options sceen to manage this
    console.log('winner, winner, chicken dinner');
}

function removePane() {

    $('#' + paneID).remove();

    // Re-centre the tenhou main panel

    let gamePane = getGamePane();
    if (isT4) {
        gamePane.css('transform' ,'translateX('
            + Math.round(($('body').width() - gamePane.width())/2)
            + 'px)');
    } else {
        gamePane.css('margin', '0 auto');
    }
}

function showAbortiveDraw(node) {

    rememberPlayerName(node);

    let outcome = node.childNodes[0].childNodes[1];
    let totalLine = '<h3>'
        + node.childNodes[0].childNodes[0].innerText
        + ' '
        + riichiHonba(outcome)
        + '</h3>';

    showResult(totalLine);
}

function handleStart(node) {
    handNum = 1;
    scorePane().empty();
    rememberPlayerName(node);
}

function checkNode(oneNode) {

    let testText = oneNode.innerText;
    if (typeof testText === 'undefined' || testText === null) {
        return;
    }

    if (false && oneNode.className.includes('nopp')) {
        console.log('========================================');
        console.log(isT4 && testText.length > 20 && testText.substr(0,2) === '役牌');
        console.log(testText);
    }
    
    if (testText.substr(0,5) === 'Start' || testText.substr(0,2) === '對局') {

        console.log('start');
        handleStart(oneNode);

    } else if (testText.length > 10
        && (testText.substr(0,6) === 'Redeal' || testText.substr(0,2) === '流局')
        && (oneNode.className === 'tbc' || (isT4 && oneNode.className.includes('nopp')))
        ) {
            
        console.log('draw');
        showExhaustiveDraw(oneNode);

    } else if (oneNode.childNodes[0].id === 'total'
        || (isT4 && testText.length > 20 && oneNode.className.includes('nopp') /*&& (
            testText.substr(0,2) === '自風' || testText.substr(0,2) === '役牌'
            || testText.substr(0,5) === 'Tsumo' || testText.substr(0,3) === 'Ron'
        )*/ ) ) {
            
        console.log('win');
        showWin(oneNode);

    } else if (
        (oneNode.className === 'tbc' || isT4)
        && (testText.substr(0,2) === '終局' || testText.substr(0,3) === 'End')
        ) {
            
        console.log('end');
        handleEnd(oneNode);

    } else if ((oneNode.className === 'tbc'
            && $('#sc0', oneNode).length
            && $('table', oneNode).length === 1)
        // || (isT4 && (testText.substr(0,2) === '流局' || testText.substr(0,5) === 'Redeal')) - TODO seems to be subsumed under general DRAW currently
        ) {
            
        console.log('abortive draw');
        showAbortiveDraw(oneNode);

    } else if ($('#' + paneID).length && (
            $('#pane1', oneNode).length 
            || (isT4 && oneNode.className.includes('s0') && testText.includes('Online:'))
        ) ) {
            
        console.log('removePane');
        removePane();

    }
}

function onMutate(mutations) {
    mutationObserver.disconnect();
    mutations.forEach(function doAMutation(oneMutation) {
        if (oneMutation.addedNodes.length) {
            oneMutation.addedNodes.forEach(function do1node(node) {
                try {
                    if (node.childNodes.length) {
                        checkNode(node);
                    }
                } catch (e) {
                    debugger;
                    console.log(e);
                }
            });
        }
    });
    setToObserve();
}

// This is what happens when the page is first loaded

chrome.storage.local.get(null, function(options) {
    getGamePane(); // ensure isT4 is set
    // we're not using options yet, but almost certainly will do eventually
    mutationObserver = new MutationObserver(onMutate);
    setToObserve();
    let timeout;
    $(window).resize(function() {
        // this has a delay, as Tenhou itself takes time
        // to resize the game pane when the screen is resized, and we need
        // to wait for it to finish before we do our stuff
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(setWidth, 1000);
    });
});

}());