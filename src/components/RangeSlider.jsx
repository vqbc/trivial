/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import Slider from "rc-slider";

export default function RangeSlider({ min, max, step = 1, value, onChange, label }) {
  // Single-value mode when `value` is a plain number; double-handle
  // range when it's [low, high]. rc-slider's onChange returns the
  // matching shape (number vs array), so we can pass onChange
  // straight through.
  const isRange = Array.isArray(value);
  return (
    <div className="input-container input-flex-full">
      <label className="range-label">{label}</label>
      <div className="range-slider-wrap">
        <Slider
          range={isRange}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          allowCross={false}
        />
        <div className="range-readout">
          {isRange ? `${value[0]} – ${value[1]}` : value}
        </div>
      </div>
    </div>
  );
}
