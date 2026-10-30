'use client';

import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { IconEdit, IconPlus, IconTrash } from '@/components/ui/icons';
import { Modal } from '@/components/ui/Modal';
import { useCurrentUser } from '@/features/auth';
import { errorMessage } from '@/lib/form';
import { useAddresses, useDeleteAddress, useSetDefaultAddress } from '../hooks/useProfile';
import type { Address } from '../types';
import { AccountPanel } from './AccountShell';
import { AddressDialog } from './AddressDialog';
import styles from './AddressBook.module.css';

/** Khớp ADDRESS_LIMIT của server */
const ADDRESS_LIMIT = 10;

export const formatAddress = (address: Address) =>
  `${address.detail}, ${address.ward}, ${address.province}`;

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  settingDefault,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  settingDefault: boolean;
}) {
  return (
    <li
      className={`panel ${address.isDefault ? 'corners' : ''} ${styles.card}`}
      data-default={address.isDefault}
    >
      <div className={styles.who}>
        <strong>{address.recipientName}</strong>
        <span>{address.phone}</span>
        {address.isDefault && <span className={styles.tag}>✦ Mặc định</span>}
      </div>
      <p className={styles.addr}>{formatAddress(address)}</p>
      {address.isDefault && <p className={styles.note}>Được chọn sẵn khi đặt hàng</p>}
      <div className={styles.tools}>
        {!address.isDefault && (
          <button type="button" className="more" onClick={onSetDefault} disabled={settingDefault}>
            Đặt làm mặc định
          </button>
        )}
        <span className={styles.icons}>
          <button type="button" onClick={onEdit} aria-label="Sửa địa chỉ" title="Sửa">
            <IconEdit width="20" height="20" />
          </button>
          <button
            type="button"
            className={styles.danger}
            onClick={onDelete}
            aria-label="Xoá địa chỉ"
            title="Xoá"
          >
            <IconTrash width="20" height="20" />
          </button>
        </span>
      </div>
    </li>
  );
}

function EmptyBook({ onAdd }: { onAdd: () => void }) {
  return (
    <div className={styles.empty}>
      <svg viewBox="0 0 120 100" width="150" height="125" fill="none" aria-hidden="true">
        <path
          className={styles.map}
          pathLength="1"
          d="M10 20l30-10 40 12 30-10v68l-30 10-40-12-30 10Z M40 10v68 M80 22v68"
        />
        <g className={styles.drop}>
          <path d="M60 62s-14-12-14-24a14 14 0 0 1 28 0c0 12-14 24-14 24Z" />
          <circle cx="60" cy="38" r="5" />
        </g>
      </svg>
      <p>Bạn chưa có địa chỉ nào</p>
      <button type="button" className="btn btn-gold" onClick={onAdd}>
        <span>Thêm địa chỉ đầu tiên</span>
      </button>
    </div>
  );
}

/** Trang /tai-khoan/dia-chi — sổ địa chỉ giao hàng (F09) */
export function AddressBook() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: user } = useCurrentUser();
  const isCustomer = user?.role === 'CUSTOMER';
  const addresses = useAddresses({ enabled: isCustomer });
  const setDefault = useSetDefaultAddress();
  const remove = useDeleteAddress();
  /** null = đóng; { address: null } = thêm mới */
  const [editing, setEditing] = useState<{ address: Address | null } | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const onError = (error: unknown) => enqueueSnackbar(errorMessage(error), { variant: 'error' });

  if (!isCustomer) {
    return (
      <AccountPanel chapter="Giao hàng" title="Sổ địa chỉ">
        <p className={styles.admin}>Tài khoản quản trị không dùng sổ địa chỉ giao hàng.</p>
      </AccountPanel>
    );
  }

  // Địa chỉ mặc định luôn đứng đầu (sort ổn định: giữ thứ tự server với phần còn lại)
  const list = [...(addresses.data ?? [])].sort(
    (a, b) => Number(b.isDefault) - Number(a.isDefault),
  );
  const full = list.length >= ADDRESS_LIMIT;

  const handleSetDefault = (address: Address) =>
    setDefault.mutate(address.id, {
      onSuccess: () => enqueueSnackbar('Đã đổi địa chỉ mặc định', { variant: 'success' }),
      onError,
    });

  const handleDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        enqueueSnackbar(
          deleting.isDefault && list.length > 1
            ? 'Đã xoá địa chỉ — địa chỉ mới nhất còn lại được đặt làm mặc định'
            : 'Đã xoá địa chỉ',
          { variant: 'success' },
        );
        setDeleting(null);
      },
      onError,
    });
  };

  return (
    <AccountPanel
      chapter="Giao hàng"
      title={
        <>
          Nơi sách <em>tìm đến bạn</em>
        </>
      }
      description="Lưu tối đa 10 địa chỉ để đặt hàng nhanh hơn"
      actions={
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => setEditing({ address: null })}
          disabled={full || addresses.isPending}
        >
          <span className={styles.add}>
            <IconPlus width="18" height="18" /> Thêm địa chỉ mới
          </span>
        </button>
      }
    >
      <div className={styles.count} aria-label={`${list.length} trên ${ADDRESS_LIMIT} địa chỉ`}>
        <span className={styles.dots} aria-hidden="true">
          {Array.from({ length: ADDRESS_LIMIT }, (_, index) => (
            <i key={index} data-on={index < list.length} />
          ))}
        </span>
        <span>
          {list.length}/{ADDRESS_LIMIT} địa chỉ
          {full && ' — đã đủ, xoá bớt để thêm'}
        </span>
      </div>

      {addresses.isPending ? (
        <div className={styles.grid} aria-busy="true">
          {[0, 1].map((index) => (
            <div key={index} className={`o-skel ${styles.skel}`} />
          ))}
        </div>
      ) : addresses.isError ? (
        <div className={styles.failBox}>
          <p className={styles.fail} role="alert">
            {errorMessage(addresses.error)}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => addresses.refetch()}>
            <span>Thử lại</span>
          </button>
        </div>
      ) : list.length === 0 ? (
        <EmptyBook onAdd={() => setEditing({ address: null })} />
      ) : (
        <ul className={styles.grid}>
          {list.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => setEditing({ address })}
              onDelete={() => setDeleting(address)}
              onSetDefault={() => handleSetDefault(address)}
              settingDefault={setDefault.isPending}
            />
          ))}
        </ul>
      )}

      {editing && (
        <AddressDialog
          key={editing.address?.id ?? 'new'}
          open
          address={editing.address}
          isFirst={!editing.address && list.length === 0}
          onClose={() => setEditing(null)}
        />
      )}

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        dismissible={!remove.isPending}
        size="sm"
        chapter="✦ Sổ địa chỉ"
        title={
          <>
            Xoá <em>địa chỉ</em> này?
          </>
        }
      >
        {deleting && (
          <div className={styles.confirm}>
            <p>
              <strong>{deleting.recipientName}</strong> – {formatAddress(deleting)}
            </p>
            {deleting.isDefault && list.length > 1 && (
              <p className={styles.note}>
                Đây là địa chỉ mặc định — địa chỉ mới nhất còn lại sẽ được đặt làm mặc định.
              </p>
            )}
            <div className={styles.confirmActions}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeleting(null)}
                disabled={remove.isPending}
              >
                <span>Giữ lại</span>
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={remove.isPending}
                aria-busy={remove.isPending}
              >
                <span>Xoá</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AccountPanel>
  );
}
