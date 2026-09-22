</main>
    <!-- App-like experience JS -->
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            // Disable text selection
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none'; // For Safari

            // Disable right-click context menu
            window.addEventListener('contextmenu', function (e) {
                e.preventDefault();
            });

            // Disable zoom
            document.addEventListener('keydown', function (event) {
                if ((event.ctrlKey === true || event.metaKey === true) && (event.key === '+' || event.key === '-' || event.key === '0')) {
                    event.preventDefault();
                }
            });
            window.addEventListener('wheel', function (event) {
                if (event.ctrlKey === true) {
                    event.preventDefault();
                }
            }, { passive: false });
        });
    </script>
    
    <!-- Game Logic Scripts (only on game.php) -->
    <?php if (basename($_SERVER['PHP_SELF']) == 'game.php'): ?>
        <script src="js/game-logic.js"></script>
        <script src="js/game-ui.js"></script>
        <?php if (isset($_GET['mode']) && $_GET['mode'] === 'ai'): ?>
            <script src="js/game-ai.js"></script>
        <?php endif; ?>
        <script>
            // Initialize the game
            document.addEventListener('DOMContentLoaded', () => {
                const gameMode = new URLSearchParams(window.location.search).get('mode') || 'hotseat';
                const ui = new GameUI();
                ui.initialize(gameMode);
            });
        </script>
    <?php endif; ?>
</body>
</html>