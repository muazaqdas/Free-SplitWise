import { Pressable, Text } from 'react-native';

interface CustomTextButtonProps {
  buttonText?: string;
  onPress?: () => void;
  className?: string;
  textClassName?: string;
}

export default function CustomTextButton({
  buttonText = '',
  onPress,
  className = '',
  textClassName = '',
}: CustomTextButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`items-center justify-center rounded-full px-4 py-2.5 active:scale-95 ${className}`}
    >
      <Text className={`text-center text-lg font-bold text-slate-900 ${textClassName}`}>{buttonText}</Text>
    </Pressable>
  );
}
