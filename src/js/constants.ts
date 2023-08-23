export abstract class Constants {
  static readonly GENIE_CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/piano_genie/model/epiano/stp_iq_auto_contour_dt_166006';
  static readonly FINGER_VALUES = [[20, 17],[16, 13],[12, 9],[8, 5],]
  static readonly ONE_HAND_TONES = ["C4","E4","G4","C5",]
  static readonly TWO_HAND_TONES = [["C4","D4","E4","F5",],["G4","A4","B4","C5",],]
  static readonly ONE_HAND_NOTE_MAP = [5,6,7,8]
  static readonly RIGHT_HAND_NOTE_MAP = [8,7,6,5,]
  static readonly LEFT_HAND_NOTE_MAP = [1,2,3,4,]
  static readonly BLUE_COLOR_PALETTE = ["#B9EDDD", "#87CBB9", "#569DAA", "#577D86"]
  static readonly PINK_COLOR_PALETTE = ["#FFF3E2", "#FFE5CA", "#FA9884", "#E74646"]
  static readonly ORANGE_COLOR_PALETTE = ["#E0D8B0", "#FCFFE7", "#DEA057", "#CE9461"]
  static readonly WIDTH_MAP: { [duration: string] : number } = {"1n": 400, "2n": 200, "4n": 100, "8n": 50}
  static readonly SPEED_MAP: { [duration: string] : number } = {"1n": 4, "2n": 8, "4n": 16, "8n": 32}
  static readonly NOTES = ["2n", "4n", "4n", "8n", "8n"]
  static VISUAL_MODE = 'cars' // 'circles' or 'lines' or 'cars'
}