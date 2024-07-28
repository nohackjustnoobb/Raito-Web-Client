import "./chaptersList.scss";

import { FunctionComponent, useState } from "react";

import {
  mdiDotsGrid,
  mdiOrderNumericAscending,
  mdiOrderNumericDescending,
  mdiViewList,
} from "@mdi/js";
import Icon from "@mdi/react";

import { Chapter, DetailsManga } from "../../models/manga";
import { formatChapterTitle, translate } from "../../utils/utils";
import SegmentedSelector from "../segmentedSelector/segmentedSelector";

type Props = {
  manga: DetailsManga;
  highlighted: Array<string>;
  onClick: (id: string) => void;
  safeArea?: { top: boolean; bottom: boolean };
  setExtraSelected?: (extraSelected: boolean) => void;
};

const ChaptersList: FunctionComponent<Props> = ({ manga, ...props }) => {
  const [extraSelected, setExtraSelected] = useState(
    !manga.chapters.serial.length
  );
  const [isGrid, setIsGrid] = useState(true);
  const [isDescending, setIsDescending] = useState(true);

  const chapters = manga
    ? structuredClone(
        extraSelected ? manga.chapters.extra : manga.chapters.serial
      )
    : [];

  if (!isDescending) chapters.reverse();

  return (
    <>
      <div
        className="chaptersList controller"
        style={{
          paddingTop: props.safeArea?.top
            ? "max(1rem, env(safe-area-inset-top))"
            : "1rem",
        }}
      >
        <span onClick={() => setIsDescending(!isDescending)}>
          <Icon
            path={
              isDescending
                ? mdiOrderNumericDescending
                : mdiOrderNumericAscending
            }
            size={1}
          />
        </span>
        <SegmentedSelector
          selected={extraSelected ? "extra" : "serial"}
          options={[
            {
              value: "serial",
              disabled: !manga.chapters.serial.length,
            },
            {
              value: "extra",
              disabled: !manga.chapters.extra.length,
            },
          ]}
          onChange={(value) => {
            setExtraSelected(value === "extra");
            if (props.setExtraSelected)
              props.setExtraSelected(value === "extra");
          }}
        />
        <span onClick={() => setIsGrid(!isGrid)}>
          <Icon path={isGrid ? mdiDotsGrid : mdiViewList} size={1} />
        </span>
      </div>
      <ul
        className={`chaptersList chapters ${isGrid ? "grid" : "list"}`}
        style={{
          marginBottom: props.safeArea?.bottom
            ? "max(1rem, env(safe-area-inset-bottom))"
            : "1rem",
        }}
      >
        {chapters.map((chapter: Chapter) => (
          <li
            key={chapter.id}
            className={
              props.highlighted.includes(chapter.id) ? "highlighted" : ""
            }
            onClick={() => props.onClick(chapter.id)}
          >
            <p>
              {isGrid
                ? formatChapterTitle(chapter.title)
                : translate(chapter.title)}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
};

export default ChaptersList;
