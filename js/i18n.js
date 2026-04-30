const I18N_STORAGE_KEY = 'td-language-v1';

const I18N = (() => {
    let currentLang = 'en';
    let applying = false;
    const originalText = new WeakMap();
    const originalAttrs = new WeakMap();

    const exact = {
        'ДЕНЬГИ': 'GOLD',
        'БАЗА': 'BASE',
        'ВОЛНА': 'WAVE',
        'СЛЕД. ВОЛНА:': 'NEXT WAVE:',
        'БОНУС:': 'BONUS:',
        '⚔ ВОЛНА — БОЙ...': '⚔ WAVE — FIGHT...',
        '⏭ НАЧАТЬ (+БОНУС)': '⏭ START (+BONUS)',
        '▮▮ ПАУЗА': '▮▮ PAUSE',
        '▶ ПРОД.': '▶ RESUME',
        'СТРОЙКА': 'BUILD',
        '🧱 БАРЬЕРЫ': '🧱 BARRIERS',
        '🔫 ТУРЕЛИ': '🔫 TURRETS',
        'Лёгкая': 'Light',
        'Средняя': 'Medium',
        'Тяжёлая': 'Heavy',
        'Пистолет': 'Pistol',
        'Пулемёт': 'Machine Gun',
        'Ферма': 'Farm',
        'Сканер': 'Scanner',
        'Стрелковая': 'Rifle',
        'Ремонтная': 'Repair',
        'Огнемёт': 'Flamethrower',
        'Крио-пушка': 'Cryo Cannon',
        'Гранатомёт': 'Grenade Launcher',
        'Снайперская': 'Sniper',
        'Ракетная': 'Rocket',
        'Импульсная': 'Pulse',
        'Тесла': 'Tesla',
        'Аэродром': 'Airfield',
        'Ядерное': 'Nuke Silo',
        'Рельсотрон': 'Railgun',
        'Стены ставятся на дорогу · турели рядом с дорогой · ПКМ — отмена': 'Walls go on the road · turrets go next to the road · RMB cancels',
        'СИСТЕМА': 'SYSTEM',
        '⚙ Настройки': '⚙ Settings',
        'Подстрой звук, клавиши и быстрые параметры под свой стиль игры. Все изменения применяются сразу.': 'Tune audio, hotkeys, and quick settings for your play style. Changes apply instantly.',
        '🎛 Аудио': '🎛 Audio',
        'Громкость, режимы и музыкальные темы боя.': 'Volume, modes, and combat music themes.',
        '🎵 Музыка': '🎵 Music',
        'Фон боя, меню и атмосферные петли': 'Battle, menu, and ambient loops',
        '🔊 Эффекты': '🔊 Effects',
        'Выстрелы, взрывы, сигналы и удары': 'Shots, explosions, alerts, and impacts',
        '🎼 Музыкальные Темы': '🎼 Music Themes',
        'Выбери саунд-дизайн, который будет крутиться во время матча.': 'Choose the soundtrack style for the match.',
        '⌨ Горячие Клавиши': '⌨ Hotkeys',
        'Нажми на кнопку, затем на новую клавишу. Повторы запрещены.': 'Press a button, then press a new key. Duplicates are blocked.',
        '↺ ВЕРНУТЬ КЛАВИШИ ПО УМОЛЧАНИЮ': '↺ RESET DEFAULT HOTKEYS',
        '⌂ ГЛАВНОЕ МЕНЮ': '⌂ MAIN MENU',
        '🔄 ПЕРЕЗАПУСК КАРТЫ': '🔄 RESTART MAP',
        'ДОБРО ПОЖАЛОВАТЬ': 'WELCOME',
        'Tower Defense: Зомби-Апокалипсис': 'Tower Defense: Zombie Apocalypse',
        'Удерживай маршруты, ставь турели, используй способности и переживи 20 волн. Перед стартом выбери режим сложности и карту операции.': 'Hold the routes, place turrets, use abilities, and survive 20 waves. Choose a difficulty and operation map before starting.',
        '▶ ВЫБРАТЬ РЕЖИМ': '▶ SELECT MODE',
        '⚙ НАСТРОЙКИ': '⚙ SETTINGS',
        'РЕЖИМ ИГРЫ': 'GAME MODE',
        'Выбери сложность': 'Choose Difficulty',
        'ДАЛЬШЕ: ВЫБОР КАРТЫ': 'NEXT: MAP SELECT',
        'ОПЕРАЦИЯ': 'OPERATION',
        'Выбор Карты': 'Map Select',
        'Выбери арену перед началом обороны. Карты отличаются маршрутом, атмосферой и тактическими окнами.': 'Choose an arena before the defense begins. Maps differ by route, atmosphere, and tactical openings.',
        '← МЕНЮ': '← MENU',
        '▶ НАЧАТЬ ОБОРОНУ': '▶ START DEFENSE',
        'ПОБЕДА': 'VICTORY',
        '🏆 ПОБЕДА': '🏆 VICTORY',
        '💀 ПОРАЖЕНИЕ': '💀 DEFEAT',
        '🔄 ИГРАТЬ СНОВА': '🔄 PLAY AGAIN',
        'ВКЛ': 'ON',
        'ВЫКЛ': 'OFF',
        'Готово к пуску': 'Ready to launch',
        '☢ ШАХТА': '☢ SILO',
        'АРСЕНАЛ': 'ARSENAL',
        'ПОКУПКА': 'PURCHASE',
        'МАЛ': 'SM',
        'СТР': 'STR',
        'ЦАРЬ': 'TSAR',
        'КУПИТЬ МАЛУЮ': 'BUY SMALL',
        'КУПИТЬ СТРАТ': 'BUY STRAT',
        'КУПИТЬ ЦАРЬ': 'BUY TSAR',
        'ИНФО': 'INFO',
        'ПРОДАТЬ': 'SELL',
        'Бешеный Глашатай': 'Frenzied Herald',
        'Пожиратель Колонн': 'Column Devourer',
        'Костяной Глушитель': 'Bone Silencer',
        'Последний Титан': 'Last Titan',
    };

    const phrase = [
        ['Лёгкий вход', 'Easy Start'],
        ['Сбалансировано', 'Balanced'],
        ['Оригинальный режим', 'Original Mode'],
        ['Меньше врагов, медленнее темп, слабее боссы. Подходит для спокойного изучения карт и башен.', 'Fewer enemies, slower pacing, weaker bosses. Good for learning maps and towers.'],
        ['Умеренный темп и чуть мягче волны. Ошибки всё ещё опасны, но игра даёт больше пространства.', 'Moderate pacing and softer waves. Mistakes still matter, but you get more room to recover.'],
        ['Текущий полный баланс: максимальный темп, плотные волны и самые жёсткие боссы.', 'The original full balance: maximum pace, dense waves, and the toughest bosses.'],
        ['Режим:', 'Mode:'],
        ['Старт:', 'Start:'],
        ['золота', 'gold'],
        ['клеток', 'cells'],
        ['поворотов', 'turns'],
        ['клеток пути', 'path cells'],
        ['База:', 'Base:'],
        ['Камера + миникарта', 'Camera + minimap'],
        ['▶ НАЧАТЬ:', '▶ START:'],
        ['Железный Перекрёсток', 'Iron Crossroads'],
        ['Ледяной Лабиринт', 'Glacial Labyrinth'],
        ['Песчаный Зигзаг', 'Dune Switchback'],
        ['Заросшая Чаша', 'Overgrowth Basin'],
        ['Угольный Разлом', 'Ember Rift'],
        ['Фронтир Конвоя', 'Frontier Convoy'],
        ['Пепельная Магистраль', 'Ashen Megaforge'],
        ['Военный лес', 'Military Forest'],
        ['Замёрзший фронт', 'Frozen Front'],
        ['Дюны и пыль', 'Dunes and Dust'],
        ['Болото и руины', 'Swamp and Ruins'],
        ['Вулканический каньон', 'Volcanic Canyon'],
        ['Огромная карта', 'Huge Map'],
        ['Старая военная трасса с грязевыми развязками и длинными прямыми для дальнобойных турелей.', 'An old military road with muddy interchanges and long lanes for long-range turrets.'],
        ['Холодный серпантин среди льда. Узкие карманы хорошо подходят под контроль и замедление.', 'A cold ice switchback. Narrow pockets work well for control and slow effects.'],
        ['Длинные пустынные колена с хорошими позициями под splash и тяжёлую оборону.', 'Long desert bends with strong positions for splash damage and heavy defense.'],
        ['Маршрут через влажные заросли и руины. Много плотных зон для засад и лечения.', 'A route through wet overgrowth and ruins, with dense areas for ambushes and repairs.'],
        ['Тёмный базальт, трещины и лава. Опасная карта с резкими сменами вертикали и длинными линиями.', 'Dark basalt, cracks, and lava. A dangerous map with sharp vertical shifts and long sightlines.'],
        ['Экспедиционная мегакарта с очень длинной дорогой. Нужны камера, миникарта и контроль нескольких зон.', 'An expedition-scale map with a very long road. Camera, minimap, and multi-zone control are required.'],
        ['Широкий раскалённый маршрут через разломы и индустриальные зоны. Очень длинный путь и несколько глухих участков.', 'A wide heated route through rifts and industrial zones, with a very long path and several dead zones.'],
        ['Бегун', 'Runner'],
        ['Зомби', 'Zombie'],
        ['Призрак', 'Ghost'],
        ['Мираж', 'Shade'],
        ['Теневик', 'Stalker'],
        ['Бронированный', 'Armored'],
        ['Толстяк', 'Tank'],
        ['Разрушитель', 'Destroyer'],
        ['Некромант', 'Necromancer'],
        ['Босс', 'Boss'],
        ['Альфа-Бегун', 'Alpha Runner'],
        ['Вожак Орды', 'Horde Warlord'],
        ['Фантом-Лорд', 'Phantom Lord'],
        ['Повелитель Миражей', 'Mirage Lord'],
        ['Теневой Палач', 'Shadow Executioner'],
        ['Стальной Колосс', 'Steel Colossus'],
        ['Громила-Титан', 'Titan Brute'],
        ['Осадный Титан', 'Siege Titan'],
        ['Архи-Некромант', 'Arch Necromancer'],
        ['Лёгкая стена', 'Light Wall'],
        ['Средняя стена', 'Medium Wall'],
        ['Тяжёлая стена', 'Heavy Wall'],
        ['Ядерная шахта', 'Nuke Silo'],
        ['Малая ракета', 'Small Missile'],
        ['Стратегическая', 'Strategic'],
        ['Царь-бомба', 'Tsar Bomb'],
        ['Апокалипсис', 'Apocalypse'],
        ['Неон Штурм', 'Neon Assault'],
        ['Железный Марш', 'Iron March'],
        ['Ледяная Ночь', 'Frozen Night'],
        ['СТРОЙКА', 'BUILD'],
        ['БАРЬЕРЫ', 'BARRIERS'],
        ['ТУРЕЛИ', 'TURRETS'],
        ['СЛЕД. ВОЛНА:', 'NEXT WAVE:'],
        ['БОНУС:', 'BONUS:'],
        ['В.', 'W.'],
        ['тёмная', 'dark'],
        ['динамика', 'dynamic'],
        ['давление', 'pressure'],
        ['атмосфера', 'atmosphere'],
        ['Прокачка', 'Upgrade'],
        ['строительство', 'construction'],
        ['группа / выбранная башня', 'group / selected tower'],
        ['Клавиши возвращены по умолчанию.', 'Hotkeys restored to defaults.'],
        ['Переназначение отменено.', 'Rebinding cancelled.'],
        ['Эту клавишу нельзя назначить. Используй буквы, цифры или основные символы.', 'This key cannot be assigned. Use letters, numbers, or basic symbols.'],
        ['уже занята:', 'is already assigned to:'],
        ['Назначено:', 'Assigned:'],
        ['Нажми новую клавишу для:', 'Press a new key for:'],
        ['Esc — отмена.', 'Esc cancels.'],
        ['Цель:', 'Target:'],
        ['Первый', 'First'],
        ['Последний', 'Last'],
        ['Сильный', 'Strong'],
        ['Ближний', 'Close'],
        ['Все', 'All'],
        ['волн пережиты!', 'waves survived!'],
        ['Зомби прорвались к базе...', 'Zombies broke through to the base...'],
        ['МИНИКАРТА', 'MINIMAP'],
        ['ЛКМ - прыжок · тащи рамку · M', 'LMB - jump · drag frame · M'],
        ['ПОЛНАЯ КАРТА', 'FULL MAP'],
        ['ПКМ/клик вне карты - закрыть · клик по карте - перейти', 'RMB/click outside closes · click map to jump'],
        ['TEST MODE', 'TEST MODE'],
        ['ВЫБРАНО', 'SELECTED'],
        ['ГРУППА', 'GROUP'],
        ['ДОБАВЛЕНО В', 'ADDED TO'],
        ['АПГРЕЙД', 'UPGRADE'],
    ];

    function translatePatterns(text) {
        return text
            .replace(/(\d+(?:[.,]\d+)?)с\b/g, '$1s')
            .replace(/(\d+(?:[.,]\d+)?)С\b/g, '$1S')
            .replace(/Ур\.(\d+)/g, 'Lv.$1')
            .replace(/(\d+)\s*шт\b/g, '$1 pcs')
            .replace(/(\d+)\s*см\b/g, '$1 cm')
            .replace(/(\d+)\s*кг\b/g, '$1 kg')
            .replace(/Волна\s+(\d+)/g, 'Wave $1')
            .replace(/ВОЛНА\s+(\d+)/g, 'WAVE $1')
            .replace(/x(\d+)/g, 'x$1');
    }

    function toEnglish(text) {
        if (!text || !/[А-Яа-яЁё]/.test(text)) return text;
        let out = exact[text.trim()] || text;
        for (const [from, to] of phrase) out = out.split(from).join(to);
        return translatePatterns(out);
    }

    function translate(text) {
        return currentLang === 'ru' ? text : toEnglish(text);
    }

    function translateTextNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return;
        const previousOriginal = originalText.get(node);
        const current = node.nodeValue;
        if (previousOriginal && current === toEnglish(previousOriginal) && currentLang === 'en') return;
        const source = previousOriginal && (current === previousOriginal || current === toEnglish(previousOriginal))
            ? previousOriginal
            : current;
        originalText.set(node, source);
        const next = currentLang === 'ru' ? source : toEnglish(source);
        if (node.nodeValue !== next) node.nodeValue = next;
    }

    function translateAttributes(el) {
        const attrs = ['title', 'aria-label', 'placeholder', 'content'];
        for (const attr of attrs) {
            if (!el.hasAttribute?.(attr)) continue;
            const key = `${attr}:${el.tagName}`;
            const map = originalAttrs.get(el) || {};
            const current = el.getAttribute(attr);
            if (!map[key] || (current !== map[key] && current !== toEnglish(map[key]))) map[key] = current;
            originalAttrs.set(el, map);
            const next = currentLang === 'ru' ? map[key] : toEnglish(map[key]);
            if (current !== next) el.setAttribute(attr, next);
        }
    }

    function walk(root) {
        if (!root) return;
        if (root.nodeType === Node.TEXT_NODE) {
            translateTextNode(root);
            return;
        }
        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
        if (root.matches?.('script, style, textarea')) return;
        if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
        for (const node of root.childNodes) walk(node);
    }

    function apply(lang = currentLang) {
        currentLang = lang === 'ru' ? 'ru' : 'en';
        applying = true;
        document.documentElement.lang = currentLang;
        document.title = currentLang === 'ru' ? 'Tower Defense: Зомби-Апокалипсис' : 'Tower Defense: Zombie Apocalypse';
        walk(document.body);
        document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]').forEach(translateAttributes);
        document.querySelectorAll('.language-switch').forEach(btn => {
            btn.textContent = currentLang === 'ru' ? 'EN' : 'RU';
            btn.title = currentLang === 'ru' ? 'Switch to English' : 'Переключить на русский';
            btn.setAttribute('aria-label', btn.title);
        });
        try { window.localStorage.setItem(I18N_STORAGE_KEY, currentLang); } catch (_) {}
        applying = false;
    }

    function toggle() {
        apply(currentLang === 'ru' ? 'en' : 'ru');
    }

    function patchCanvasText() {
        if (!window.CanvasRenderingContext2D?.prototype) return;
        const proto = window.CanvasRenderingContext2D.prototype;
        if (proto.__tdI18nPatched) return;
        const fillText = proto.fillText;
        const strokeText = proto.strokeText;
        proto.fillText = function(text, ...args) {
            return fillText.call(this, typeof text === 'string' ? translate(text) : text, ...args);
        };
        proto.strokeText = function(text, ...args) {
            return strokeText.call(this, typeof text === 'string' ? translate(text) : text, ...args);
        };
        proto.__tdI18nPatched = true;
    }

    function init() {
        try { currentLang = window.localStorage.getItem(I18N_STORAGE_KEY) || 'en'; } catch (_) { currentLang = 'en'; }
        if (currentLang !== 'ru') currentLang = 'en';
        patchCanvasText();
        document.addEventListener('click', (e) => {
            if (e.target?.closest?.('.language-switch')) toggle();
        });
        const observer = new MutationObserver((mutations) => {
            if (applying) return;
            applying = true;
            for (const mutation of mutations) {
                if (mutation.type === 'characterData') translateTextNode(mutation.target);
                for (const node of mutation.addedNodes) walk(node);
                if (mutation.type === 'attributes') translateAttributes(mutation.target);
            }
            applying = false;
        });
        observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder', 'content'] });
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => apply(currentLang));
        else apply(currentLang);
    }

    init();

    return { apply, toggle, translate, get lang() { return currentLang; } };
})();
