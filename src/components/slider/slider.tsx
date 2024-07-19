import "./slider.scss";

import { Component } from "react";

interface SliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}

class Slider extends Component<SliderProps> {
  positions: Array<number> = [];
  isDragging: boolean = false;
  onMoveRef = this.onMove.bind(this);
  onUpRef = this.onUp.bind(this);

  onMove(event: MouseEvent | TouchEvent) {
    if (this.isDragging) {
      const clientX = (event instanceof TouchEvent ? event.touches[0] : event)
        .clientX;

      const index = this.positions.findIndex((v) => v > clientX);
      if (index === -1) return;

      const value = this.props.min + index;
      if (this.props.value !== value) this.props.onChange(value);
    }
  }

  onUp() {
    if (this.isDragging) this.isDragging = false;
  }

  componentDidMount() {
    document.addEventListener("mousemove", this.onMoveRef);
    document.addEventListener("mouseup", this.onUpRef);

    document.addEventListener("touchmove", this.onMoveRef);
    document.addEventListener("touchend", this.onUpRef);
    document.addEventListener("touchcancel", this.onUpRef);
  }

  componentWillUnmount() {
    document.removeEventListener("mousemove", this.onMoveRef);
    document.removeEventListener("mouseup", this.onUpRef);

    document.removeEventListener("touchmove", this.onMoveRef);
    document.removeEventListener("touchend", this.onUpRef);
    document.removeEventListener("touchcancel", this.onUpRef);
  }

  render() {
    const count = this.props.max - this.props.min + 1;
    const perc = (this.props.value / count) * 100;

    return (
      <span className="slider">
        <span className="active" style={{ width: `${perc}%` }} />
        <span className="inactive" style={{ width: `${100 - perc}%` }} />
        <span
          className="pointer"
          style={{ left: `${perc}%` }}
          onMouseDown={() => (this.isDragging = true)}
          onTouchStart={() => (this.isDragging = true)}
        />
        <ul
          ref={(ref) => {
            if (ref) {
              const elems = ref.getElementsByTagName("li");
              for (const elem of Array.from(elems))
                this.positions.push(elem.getBoundingClientRect().right);
            }
          }}
        >
          {Array(count)
            .fill(0)
            .map((_, idx) => (
              <li
                key={idx}
                onClick={() => {
                  const value = this.props.min + idx;
                  if (this.props.value !== value) this.props.onChange(value);
                }}
              />
            ))}
        </ul>
      </span>
    );
  }
}

export default Slider;
