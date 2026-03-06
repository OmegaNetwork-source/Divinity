/**
 * Standalone theme toggle — loads first so it works even if config.local.js or script.js fail.
 * Default: Heaven. User can toggle to Hell and back.
 */
(function () {
    var isGallery = typeof window !== 'undefined' && (window.location.pathname || '').indexOf('gallery.html') !== -1;

    function applyTheme(heaven) {
        var isHeaven = !!heaven;
        if (!isGallery) {
            try { localStorage.setItem('divinity_theme', isHeaven ? 'heaven' : 'hell'); } catch (e) {}
        }
        document.body.classList.remove('theme-heaven', 'theme-hell');
        document.body.classList.add(isHeaven ? 'theme-heaven' : 'theme-hell');

        var heavenEl = document.querySelector('.label-heaven');
        var hellEl = document.querySelector('.label-hell');
        var statusEl = document.getElementById('status-text');
        if (heavenEl) heavenEl.classList.toggle('active', isHeaven);
        if (hellEl) hellEl.classList.toggle('active', !isHeaven);
        if (statusEl) statusEl.textContent = isHeaven ? 'ELYSIUM' : 'TARTARUS';

        if (typeof window.initParticles === 'function') window.initParticles();
    }

    function handleClick(e) {
        var toggle = document.getElementById('realm-toggle');
        if (!toggle || !e || !e.target) return;
        if (!toggle.contains(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        var isHeaven = document.body.classList.contains('theme-heaven');
        if (e.target.closest && e.target.closest('.label-heaven')) {
            applyTheme(true);
        } else if (e.target.closest && e.target.closest('.label-hell')) {
            applyTheme(false);
        } else {
            applyTheme(!isHeaven);
        }
    }

    window.divinitySetTheme = function (theme) {
        applyTheme(theme !== 'hell');
    };
    window.divinityRealmClick = function (e) {
        if (!e || !e.target) return;
        var toggle = document.getElementById('realm-toggle');
        if (!toggle || !toggle.contains(e.target)) return;
        var isHeaven = document.body.classList.contains('theme-heaven');
        if (e.target.closest && e.target.closest('.label-heaven')) applyTheme(true);
        else if (e.target.closest && e.target.closest('.label-hell')) applyTheme(false);
        else applyTheme(!isHeaven);
    };

    document.addEventListener('click', handleClick, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { applyTheme(true); });
    } else {
        applyTheme(true);
    }
})();
