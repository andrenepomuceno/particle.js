var Stats = function () {
    var mode = 0;

    var container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        cursor: pointer;
        opacity: 0.9;
        z-index: 100
    `;

    container.addEventListener('click', function (event) {
        event.preventDefault();
        showPanel(++mode % container.children.length);
    }, false);

    function addPanel(panel) {
        container.appendChild(panel.dom);
        return panel;
    }

    function showPanel(id) {
        for (var i = 0; i < container.children.length; i++) {
            container.children[i].style.display = i === id ? 'block' : 'none';
        }
        mode = id;
    }

    var beginTime = Date.now(), prevTime = beginTime, frames = 0;
    var fpsPanel = addPanel(new Stats.Panel('FPS'));
    var fpsMax = 0;

    return {
        REVISION: 16,
        dom: container,
        addPanel: addPanel,
        showPanel: showPanel,
        begin: function () {
            beginTime = Date.now();
        },
        end: function () {
            frames++;
            var time = Date.now();
            if (time >= prevTime + 1000) {
                let fps = (frames * 1000) / (time - prevTime);
                if (fps > fpsMax) fpsMax = fps;
                fpsPanel.update(fps, fpsMax);
                prevTime = time;
                frames = 0;
            }
            return time;
        },
        update: function () {
            beginTime = this.end();
        },
        // Backwards Compatibility
        domElement: container,
        setMode: showPanel,
        fpsPanel
    };
};

Stats.Panel = function (name, fg = '#0ff', bg = '#222') {
    var min = Infinity, max = 0, round = Math.round;
    var PR = round(window.devicePixelRatio || 1);

    const W = 100, H = 60;
    const FONT_H = 10 * PR;
    const WIDTH = W * PR, HEIGHT = H * PR,
        TEXT_X = 3 * PR, TEXT_Y = 2 * PR,
        GRAPH_X = TEXT_X, GRAPH_Y = 2 * TEXT_Y + FONT_H,
        GRAPH_WIDTH = WIDTH - 2 * TEXT_X, GRAPH_HEIGHT = HEIGHT - GRAPH_Y - TEXT_Y;

    var canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.cssText = 'width: ' + W + 'px; height: ' + H + 'px;';

    var context = canvas.getContext('2d');
    context.font = 'bold ' + FONT_H + 'px Helvetica, Arial, sans-serif';
    context.textBaseline = 'top';

    function blank() {
        min = Infinity, max = 0;

        context.fillStyle = bg;
        context.fillRect(0, 0, WIDTH, HEIGHT);

        context.fillStyle = fg;
        context.fillText(name, TEXT_X, TEXT_Y);
        context.fillRect(GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT);

        context.fillStyle = bg;
        context.globalAlpha = 0.9;
        context.fillRect(GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT);
    }

    blank();

    return {
        dom: canvas,

        update: function (value, maxValue) {
            min = Math.min(min, value);
            max = maxValue;

            context.fillStyle = bg;
            context.globalAlpha = 1;
            context.fillRect(0, 0, WIDTH, GRAPH_Y);
            context.fillStyle = fg;
            let text = name + ' ';
            if (Math.abs(value) > 1000) {
                text += value.toExponential(1) + ', ';
            } else {
                text += value.toFixed(1) + ', ';
            }
            if (Math.abs(max) > 999) {
                text += max.toExponential(0);
            } else {
                text += max.toFixed(1);
            }
            context.fillText(text, TEXT_X, TEXT_Y);

            context.drawImage(canvas, GRAPH_X + PR, GRAPH_Y, GRAPH_WIDTH - PR, GRAPH_HEIGHT, GRAPH_X, GRAPH_Y, GRAPH_WIDTH - PR, GRAPH_HEIGHT);

            context.fillRect(GRAPH_X + GRAPH_WIDTH - PR, GRAPH_Y, PR, GRAPH_HEIGHT);

            context.fillStyle = bg;
            context.globalAlpha = 0.9;
            context.fillRect(GRAPH_X + GRAPH_WIDTH - PR, GRAPH_Y, PR, round((1 - (value / maxValue)) * GRAPH_HEIGHT));
        },

        cleanup: function () {
            blank();
        }
    };
};

export default Stats;
