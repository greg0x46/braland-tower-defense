import Phaser from 'phaser';
import { AudioSettings } from '../core/AudioSettings';
import { GameEvents, onGameEvent, type GameEventPayloads } from '../core/EventBus';
import { BACKGROUND_TRACK } from '../data/audio';
import backgroundTrackUrl from '../assets/audio/sideways-samba.mp3';

/** O que `SoundManager.add()` devolve, qualquer que seja o motor disponível. */
type MusicSound =
  | Phaser.Sound.WebAudioSound
  | Phaser.Sound.HTML5AudioSound
  | Phaser.Sound.NoAudioSound;

/**
 * A cola entre a trilha e o Phaser — o **único** módulo do projeto que fala com o
 * Sound Manager e o único que conhece o caminho do `.mp3` (contrato C1, mesma
 * disciplina que a BootScene aplica às texturas).
 *
 * Três decisões carregam esta classe:
 *
 * 1. **O som vive no Sound Manager global** (`scene.sound` é o do jogo, não da
 *    cena). Reiniciar a partida recria GameScene e UIScene, mas não toca no som —
 *    é isso que faz "instância única através do restart" (FR-003) cair de graça em
 *    vez de virar lógica defensiva.
 * 2. **O carregamento não passa pelo `preload()`.** O arquivo tem 6 MB; no preload
 *    ele seguraria o boot inteiro — música atrasando gameplay é o que o Princípio I
 *    proíbe. Aqui o jogo abre jogável e a faixa entra quando chega (C2).
 * 3. **O volume aplicado é sempre o efetivo**, recebido pronto por evento. Este
 *    módulo não sabe o que é "mudo" — quem decide isso é `systems/audioSettings` (C6).
 *
 * Cuidado ao mexer: autoplay travado (C3) é **espera esperada** e não registra erro;
 * falha de carregamento (C4) **registra**. Confundir os dois enche o console de erro
 * falso a cada primeiro load — ou esconde uma falha real de asset atrás de "ah, deve
 * ser o autoplay".
 */
export class MusicManager {
  private readonly scene: Phaser.Scene;
  private track: MusicSound | null = null;
  private started = false;
  private playing = false;

  /**
   * @param scene Cena dona do passe de carregamento. Precisa ser uma cena que
   * **não** é encerrada nem reiniciada: `LoaderPlugin.shutdown()` chama
   * `removeAllListeners()`, então uma cena que morre leva junto os handlers deste
   * load e a música nunca chegaria. Hoje: a BootScene (ver `BootScene.create()`).
   */
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Idempotente por contrato (C1): chamar duas vezes não cria um segundo som, não
   * redispara o load e não reinicia a faixa.
   */
  start(): void {
    if (this.started) return;
    this.started = true;

    // Antes de tudo: a preferência salva precisa estar em vigor quando o som
    // nascer, senão um jogador que silenciou o jogo ouviria um instante de música
    // alta ao voltar (C6). Fica aqui, e não no chamador, porque é aqui que o som é
    // criado — a ordem não pode depender de quem chama.
    AudioSettings.load();

    onGameEvent(GameEvents.AUDIO_SETTINGS_CHANGED, this.onSettingsChanged, this);

    const loader = this.scene.load;
    loader.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.onFileLoadError, this);
    loader.once(Phaser.Loader.Events.COMPLETE, this.onLoadComplete, this);
    loader.audio(BACKGROUND_TRACK.cacheKey, backgroundTrackUrl);

    // Passe próprio, fora do preload: o boot não espera o download (C2).
    loader.start();
  }

  private onLoadComplete = (): void => {
    const { cacheKey, loop } = BACKGROUND_TRACK;

    // Falhou o download? O erro já saiu em onFileLoadError; o jogo segue em
    // silêncio (C4). Sem esta guarda, `sound.add` lançaria por chave ausente.
    if (!this.scene.cache.audio.exists(cacheKey)) return;

    // Nasce já com o volume efetivo: uma preferência "mudo" vinda do storage nunca
    // deixa escapar um instante de música alta antes de silenciar (C6).
    this.track = this.scene.sound.add(cacheKey, {
      loop,
      volume: AudioSettings.effectiveVolume,
    });

    if (this.scene.sound.locked) {
      // Autoplay travado: esperar o primeiro gesto do jogador é o caminho normal,
      // não uma falha. Nada de console.error aqui (C3).
      this.scene.sound.once(Phaser.Sound.Events.UNLOCKED, this.play, this);
      return;
    }

    this.play();
  };

  /** Guard contra tocar duas vezes: se UNLOCKED chegar tarde, o handler é inerte (C3). */
  private play = (): void => {
    if (this.playing || this.track === null) return;
    this.playing = true;
    this.track.play();
  };

  /** Consome o volume efetivo; não recalcula a regra de mudo (C6). */
  private onSettingsChanged = ({
    effectiveVolume,
  }: GameEventPayloads['audio-settings-changed']): void => {
    this.track?.setVolume(effectiveVolume);
  };

  /** Falha real de asset: visível, mas nunca fatal (C4, Princípio X). */
  private onFileLoadError = (file: Phaser.Loader.File): void => {
    if (file.key !== BACKGROUND_TRACK.cacheKey) return;
    console.error(
      `[MusicManager] Falha ao carregar a trilha "${file.key}" (${file.url}); o jogo segue em silêncio.`,
    );
  };
}
