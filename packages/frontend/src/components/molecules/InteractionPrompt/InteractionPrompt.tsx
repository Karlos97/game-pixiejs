import styles from "./InteractionPrompt.module.scss";

interface Props {
  npcName: string;
}

export function InteractionPrompt({ npcName }: Props) {
  return (
    <div className={styles.prompt}>
      <kbd className={styles.key}>E</kbd>
      <span>
        Talk to <strong>{npcName}</strong>
      </span>
    </div>
  );
}
