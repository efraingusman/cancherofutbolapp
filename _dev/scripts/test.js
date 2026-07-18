const fs = require('fs');

global.document = {
    addEventListener: () => {},
    getElementById: () => ({ innerHTML: '' }),
    querySelector: () => ({ innerHTML: '' }),
    querySelectorAll: () => []
};
global.window = {
    addEventListener: () => {},
    history: { pushState: () => {} },
    scrollTo: () => {}
};

const code = fs.readFileSync('script.js', 'utf8').replace('const app =', 'global.app =');
eval(code);

try {
    app.root = { innerHTML: '' };
    app.navLinks = { innerHTML: '' };
    app.render('player-dashboard');
    console.log("Success player dashboard");
    app.render('club-dashboard');
    console.log("Success club dashboard");
} catch (e) {
    console.error(e);
}
