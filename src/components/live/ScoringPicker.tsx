import { MAX_POINTS, MIN_CORRECT_POINTS } from "../../utils/calculateScore";
import type { ScoringMode } from "../../types";

type Props = {
  mode: ScoringMode;
  disabled?: boolean;
  onChange: (mode: ScoringMode) => void;
};

function ScoringPicker({ mode, disabled, onChange }: Props) {
  return (
    <fieldset className="scoring" disabled={disabled}>
      <legend>طريقة النقاط</legend>
      <label>
        <input
          type="radio"
          name="scoring"
          checked={mode === "fixed"}
          onChange={() => onChange("fixed")}
        />{" "}
        ثابتة: كل إجابة صحيحة {MAX_POINTS} نقطة
      </label>
      <label>
        <input
          type="radio"
          name="scoring"
          checked={mode === "speed"}
          onChange={() => onChange("speed")}
        />{" "}
        مع مكافأة سرعة: من {MIN_CORRECT_POINTS} إلى {MAX_POINTS} حسب سرعة الإجابة
      </label>
    </fieldset>
  );
}

export default ScoringPicker;