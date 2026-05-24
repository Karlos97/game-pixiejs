import styles from "./DialogLine.module.scss";

interface Props {
  speaker: string;
  text: string;
}

export function DialogLine({ speaker, text }: Props) {
  return (
    <div className={styles.line}>
      <div className={styles.speaker}>{speaker}</div>
      <div className={styles.text}>{text}</div>
    </div>
  );
}
