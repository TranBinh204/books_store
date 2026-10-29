'use client';

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconButton } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useRef, useState, type DragEvent } from 'react';
import { IconAddPhoto, IconClose } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { errorMessage } from '@/lib/form';
import type { UploadedImage } from '../../catalog-types';
import { useUploadImages } from '../hooks/useBooks';
import styles from './ImageUploader.module.css';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

interface ImageUploaderProps {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  /** Số ảnh tối đa (khớp BOOK_MAX_IMAGES ở server) */
  max?: number;
  error?: string;
}

function SortableImage({
  image,
  index,
  onRemove,
}: {
  image: UploadedImage;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.publicId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${styles.tile} ${index === 0 ? styles.cover : ''} ${
        isDragging ? styles.dragging : ''
      }`}
    >
      {/* Vùng kéo thả = toàn bộ ảnh */}
      <div {...attributes} {...listeners} className={styles.handle}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh từ Cloudinary / local, không qua next/image */}
        <img src={image.url} alt={`Ảnh ${index + 1}`} />
      </div>
      {index === 0 && <span className={styles.badge}>Ảnh đại diện</span>}
      <IconButton
        size="small"
        onClick={onRemove}
        aria-label="Xoá ảnh"
        className={styles.remove}
      >
        <IconClose width={16} />
      </IconButton>
    </div>
  );
}

/** Upload nhiều ảnh (bấm chọn hoặc kéo thả file vào), kéo đổi thứ tự, ảnh đầu = ảnh đại diện */
export function ImageUploader({ value, onChange, max = 10, error }: ImageUploaderProps) {
  const { enqueueSnackbar } = useSnackbar();
  const upload = useUploadImages();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []).filter((file) => ACCEPT.includes(file.type));
    if (files.length === 0) return;
    const room = max - value.length;
    if (room <= 0) {
      enqueueSnackbar(`Tối đa ${max} ảnh`, { variant: 'warning' });
      return;
    }
    if (files.length > room) {
      enqueueSnackbar(`Chỉ thêm được ${room} ảnh nữa (tối đa ${max})`, { variant: 'warning' });
    }
    upload.mutate(files.slice(0, room), {
      onSuccess: (uploaded) => onChange([...value, ...uploaded]),
      onError: (err) => enqueueSnackbar(errorMessage(err), { variant: 'error' }),
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = value.findIndex((image) => image.publicId === active.id);
    const to = value.findIndex((image) => image.publicId === over.id);
    onChange(arrayMove(value, from, to));
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={value.map((image) => image.publicId)}
          strategy={rectSortingStrategy}
        >
          <div className={styles.grid}>
            {value.map((image, index) => (
              <SortableImage
                key={image.publicId}
                image={image}
                index={index}
                onRemove={() => onChange(value.filter((item) => item.publicId !== image.publicId))}
              />
            ))}

            {value.length < max && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                disabled={upload.isPending}
                className={`${styles.add} ${dragOver ? styles.addOver : ''}`}
              >
                {upload.isPending ? (
                  <Spinner />
                ) : (
                  <>
                    <IconAddPhoto width={26} />
                    Thêm ảnh
                  </>
                )}
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(',')}
        multiple
        hidden
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <p className={`${styles.hint} ${error ? styles.hintError : ''}`}>
        {error ??
          `${value.length}/${max} ảnh · jpg, png, webp · kéo ảnh để đổi thứ tự, ảnh đầu tiên là ảnh đại diện`}
      </p>
    </div>
  );
}
